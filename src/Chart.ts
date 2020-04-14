import { ChartSong } from './ChartSong';
import { ChartSync } from './ChartSync';
import { ChartEvent } from './ChartEvent';
import { ChartNote } from './ChartNote';
import { ChartStar } from './ChartStar';
import * as _ from 'lodash';

export type ChartTrackData = ChartEvent | ChartNote | ChartStar;
export type ChartTrack<T> = {[position: number]: T[]};
export type ChartTracks = {[name: string]: ChartTrack<ChartTrackData>};

export class Chart {
    Song: ChartSong = new ChartSong();
    SyncTrack: ChartTrack<ChartSync> = {};
    Events: ChartTrack<ChartEvent> = {};

    tracks: ChartTracks = {}

    copyChart(): Chart
    {
        let chart = new Chart();
        chart.Song = _.cloneDeep(this.Song);
        chart.SyncTrack = _.cloneDeep(this.SyncTrack);
        chart.Events = _.cloneDeep(this.Events);
        chart.tracks = _.cloneDeep(this.tracks);
        return chart;
    }

    copyTrack<T>(track: ChartTrack<T>): ChartTrack<T>
    {
        return _.cloneWith(track);
    }

    transform(fn: <T>(input: ChartTrack<T>) => ChartTrack<T>): Chart
    {
        let newChart = new Chart();
        newChart.Song = _.cloneDeep(this.Song);
        newChart.SyncTrack = fn(this.SyncTrack || {});
        newChart.Events = fn(this.Events || {});
        for (let trackName in this.tracks)
            newChart.tracks[trackName] = fn(this.tracks[trackName] || {});
        return newChart;
    }

    pushTrackData<T>(track: ChartTrack<T>, time: number, data: T)
    {
        let elt = track[time];
        if (elt)
            elt.push(data);
        else
            track[time] = [data];
    }

    filterTrack<T>(track: ChartTrack<T>, callbackfn: (value: T[], index: number) => boolean): ChartTrack<T>
    {
        return Object.fromEntries(Object.entries(track).filter(ent => callbackfn(ent[1], parseInt(ent[0]))));
    }

    mapTrackEntries<T>(track: ChartTrack<T>, callbackfn: (value: T[], index: number) => [number, T[]]): ChartTrack<T>
    {
        return Object.fromEntries(Object.entries(track).map(ent => callbackfn(ent[1], parseInt(ent[0]))));
    }

    concatTrack<T>(track1: ChartTrack<T>, track2: ChartTrack<T>): ChartTrack<T>
    {
        let entries = Object.entries(track1).concat(Object.entries(track2));
        entries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        let old: [string, T[]] = ["", []];
        for (let ent of entries)
        {
            if (ent[0] == old[0])
            {
                ent[1] = old[1].concat(ent[1]);
            }
            old = ent
        }
        return Object.fromEntries(entries);
    }

    convertTrackResolution<T>(track: ChartTrack<T>, resolution: number): ChartTrack<T>
    {
        let convertedTrack: ChartTrack<T> = {};
        for (let time in track)
        {
            convertedTrack[Math.round(parseInt(time) * resolution / this.Song.Resolution)] = track[time];
        }
        return convertedTrack;
    }

    firstNotePosition(): number
    {
        let start = Infinity;
        for (let trackName in this.tracks)
        {
            let entries = Object.entries(this.tracks[trackName]);
            if (!entries.length)
                continue;
            let trackStart = parseInt(entries[0][0]);
            if (trackStart < start)
                start = trackStart;
        }
        if (start == Infinity)
            return 0;
        return start;
    }

    lastNotePosition(): number
    {
        let end = 0;
        for (let trackName in this.tracks)
        {
            let entries = Object.entries(this.tracks[trackName]);
            if (!entries.length)
                continue;
            let trackEnd = parseInt(entries[entries.length - 1][0]);
            if (trackEnd > end)
                end = trackEnd;
        }
        return end;
    }

    filterPositions(callbackfn: (pos: number) => boolean): Chart
    {
        return this.transform(track => this.filterTrack(track, (ent, index) => callbackfn(index)));
    }

    mapPositions(callbackfn: (pos: number) => number): Chart
    {
        return this.transform(track => this.mapTrackEntries(track, (ent, index) => [callbackfn(index), ent]));
    }

    concat(chart: Chart): Chart
    {
        let newChart = new Chart();
        newChart.Song = this.Song;
        newChart.SyncTrack = this.concatTrack(this.SyncTrack, chart.SyncTrack);
        newChart.Events = this.concatTrack(this.Events, chart.Events);
        for (let trackName in chart.tracks)
            newChart.tracks[trackName] = this.concatTrack(this.tracks[trackName] || {}, chart.tracks[trackName]);
        return newChart;
    }

    mergeWith(chart: Chart, callbackfn: (pos: number) => number, ignoreSync: boolean = false, ignoreEvents: boolean = false)
    {
        let specialTracks = [];
        if (!ignoreSync)
            specialTracks.push([this.SyncTrack, chart.SyncTrack]);
        if (!ignoreEvents)
            specialTracks.push([this.Events, chart.Events]);
        for (let specialTrack of specialTracks)
        {
            for (let _time in specialTrack[1])
            {
                specialTrack[0][callbackfn(parseInt(_time))] = specialTrack[1][_time];
            }
        }

        for (let trackName in chart.tracks)
        {
            let chartTrack = this.tracks[trackName];
            if (!chartTrack)
                chartTrack = this.tracks[trackName] = {};
            let partTrack = chart.tracks[trackName];
            for (let _time in partTrack)
            {
                chartTrack[callbackfn(parseInt(_time))] = partTrack[_time];
            }
        }
    }

    convertResolution(resolution: number): void
    {
        if (this.Song.Resolution == resolution)
            return;

        this.SyncTrack = this.convertTrackResolution(this.SyncTrack, resolution);
        this.Events = this.convertTrackResolution(this.Events, resolution);
        for (let trackName in this.tracks)
            this.tracks[trackName] = this.convertTrackResolution(this.tracks[trackName], resolution);
        this.Song.Resolution = resolution;
    }

    bpsAt(position: number): number
    {
        let bps = -1;
        for (let k in this.SyncTrack)
        {
            if (parseInt(k) > position)
                return bps;
            for (let ev of this.SyncTrack[k])
            {
                if (ev.type == "B")
                    bps = ev.value;
            }
        }
        return bps;
    }

    signatureAt(position: number): number
    {
        let ts = -1;
        for (let k in this.SyncTrack)
        {
            if (parseInt(k) > position)
                return ts;
            for (let ev of this.SyncTrack[k])
            {
                if (ev.type == "TS")
                    ts = ev.value;
            }
        }
        return ts;
    }

    eventAt(position: number): string | undefined
    {
        let ev;
        for (let k in this.Events)
        {
            if (parseInt(k) > position)
                return ev;
            for (let e of this.Events[k])
            {
                if (e.type == "E")
                    ev = e.name;
            }
        }
        return ev;
    }

    positionToSeconds(position: number): number {
        let bps = 120000;
        let elapsed = 0;
        let lastts = 0;
        for (let k in this.SyncTrack) {
            for (let ev of this.SyncTrack[k]) {
                let ts = parseInt(k);
                if (ts >= position)
                    break;
                elapsed += (ts - lastts) * 60000 / bps / this.Song.Resolution;
                if (ev.type == "B")
                    bps = ev.value;
                lastts = ts;
            }
        }
        elapsed += (position - lastts) * 60000 / bps / this.Song.Resolution;
        return elapsed;
    }

    secondsToPosition(seconds: number): number {
        let bps = 120000;
        let lastBpsChange = 0;
        let elapsed = 0;
        let lastts = 0;
        for (let k in this.SyncTrack) {
            for (let ev of this.SyncTrack[k]) {
                let ts = parseInt(k);
                lastBpsChange = elapsed;
                elapsed += (ts - lastts) * 60000 / bps / this.Song.Resolution;

                if (elapsed > seconds)
                    return lastts + (elapsed - lastBpsChange) / (60000 / bps / this.Song.Resolution);
                if (ev.type == "B")
                    bps = ev.value;
                lastts = ts;
            }
        }
        return lastts + (seconds - lastBpsChange) / (60000 / bps / this.Song.Resolution);
    }

    findSectionPosition(name: string): number {
        for (let k in this.Events) {
            for (let ev of this.Events[k]) {
                if (ev.name.toLowerCase().replace(/_/g, ' ') == "section " + name.toLowerCase().replace(/_/g, ' '))
                    return parseInt(k);
            }
        }
        return -1;
    }
}
