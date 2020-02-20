import { ChartSong } from './ChartSong';
import { ChartSync } from './ChartSync';
import { ChartEvent } from './ChartEvent';
import { ChartNote } from './ChartNote';
import { ChartStar } from './ChartStar';

export type ChartTrackData = ChartEvent | ChartNote | ChartStar;
export type ChartTrack<T> = {[position: number]: T[]}

export class Chart {
    Song: ChartSong = new ChartSong();
    SyncTrack: ChartTrack<ChartSync> = {};
    Events: ChartTrack<ChartEvent> = {};
    ExpertSingle: ChartTrack<ChartTrackData> = {};

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

    filterPositions(callbackfn: (pos: number) => boolean): Chart
    {
        let newChart = new Chart();
        newChart.Song = this.Song;
        newChart.ExpertSingle = this.filterTrack(this.ExpertSingle, (ent, index) => callbackfn(index));
        newChart.SyncTrack = this.filterTrack(this.SyncTrack, (ent, index) => callbackfn(index));
        newChart.Events = this.filterTrack(this.Events, (ent, index) => callbackfn(index));
        return newChart;
    }

    mapPositions(callbackfn: (pos: number) => number): Chart
    {
        let newChart = new Chart();
        newChart.Song = this.Song;
        newChart.SyncTrack = this.mapTrackEntries(this.SyncTrack, (ent, index) => [callbackfn(index), ent]);
        newChart.Events = this.mapTrackEntries(this.Events, (ent, index) => [callbackfn(index), ent]);
        newChart.ExpertSingle = this.mapTrackEntries(this.ExpertSingle, (ent, index) => [callbackfn(index), ent]);
        return newChart;
    }

    concat(chart: Chart): Chart
    {
        let newChart = new Chart();
        newChart.Song = this.Song;
        newChart.SyncTrack = this.concatTrack(this.SyncTrack, chart.SyncTrack);
        newChart.Events = this.concatTrack(this.Events, chart.Events);
        newChart.ExpertSingle = this.concatTrack(this.ExpertSingle, chart.ExpertSingle);
        return newChart;
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
                if (ts > position)
                    ts = position;
                elapsed += (ts - lastts) * 60000 / bps / this.Song.Resolution;
                if (ts == position)
                    return elapsed;
                if (ev.type == "B")
                    bps = ev.value;
                lastts = ts;
            }
        }
        return elapsed;
    }

    findSectionPosition(name: string): number {
        for (let k in this.Events) {
            for (let ev of this.Events[k]) {
                if (ev.name.toLowerCase() == "section " + name.toLowerCase())
                    return parseInt(k);
            }
        }
        return -1;
    }
}
