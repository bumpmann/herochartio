import * as fse from 'fs-extra'
import { ChartSync } from './ChartSync'
import { ChartEvent } from './ChartEvent'
import { Chart, ChartTrack } from './Chart'
import { ChartIO } from '.';

const midi = require('midi-file');

export class MidiChart
{
    static silent: boolean = false;

    static async load(path: string): Promise<Chart>
    {
        let chart = MidiChart.parse(await fse.readFile(path));
        return chart;
    }

    static parse(content: Buffer): Chart
    {
        let obj = MidiChart.midiToObject(content);
        let chart: Chart = new Chart();

        let tracksNameTranslate: {[name: string]: string} = {'PART GUITAR': 'Single', 'PART BASS': 'DoubleBass', 'PART DRUMS': 'Drums', 'PART VOCALS': ''};
        let difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];

        let approx = ChartIO.moonscraper_style ? Math.floor : Math.round;

        chart.Song.Offset = 0;
        chart.Song.Resolution = obj.header.ticksPerBeat;
        chart.Song.Player2 = "bass";
        chart.Song.Difficulty = 0;
        chart.Song.PreviewStart = 0;
        chart.Song.PreviewEnd = 0;
        chart.Song.Genre = "rock";
        chart.Song.MediaType = "cd";
        chart.SyncTrack = {'0': []};

        for (let obj_track of obj.tracks)
        {
            let time = 0;
            let trackName = "";
            let lastNote: {[name: string]: number} = {};
            let lastTimedNote: {[name: string]: number} = {};
            let openNote: {[name: string]: boolean} = {};
            let tappingNote: {[name: string]: boolean} = {};
            for (let difficulty of difficulties)
            {
                lastNote[difficulty] = -2000;
                lastTimedNote[difficulty] = -2000;
                openNote[difficulty] = false;
                tappingNote[difficulty] = false;
            }
            for (let index = 0; index < obj_track.length; index++)
            {
                let elt = obj_track[index];
                time += elt.deltaTime;

                if (elt.type == "setTempo")
                    chart.pushTrackData(chart.SyncTrack, time, {type: "B", value: approx(60000000000 / elt.microsecondsPerBeat)});
                else if (elt.type == "timeSignature")
                    chart.pushTrackData(chart.SyncTrack, time, {type: "TS", value: elt.numerator});
                else if (elt.type == "trackName")
                    trackName = elt.text;
                else if (elt.type == "text")
                {
                    if (trackName == "EVENTS")
                    {
                        let sectionName = elt.text.match(/\[(.*)\]/);
                        if (sectionName && sectionName[1])
                            chart.pushTrackData(chart.Events, time, {type: "E", name: sectionName[1]});
                        else
                            chart.pushTrackData(chart.Events, time, {type: "E", name: elt.text});
                    }
                }
                else if (elt.type == "noteOn")
                {
                    if (trackName)
                    {
                        for (let i = 0; i < difficulties.length; i++)
                        {
                            let difficulty = difficulties[i];
                            let chartTrackName = difficulty + tracksNameTranslate[trackName];
                            let track = chart.tracks[chartTrackName];
                            if (!track)
                                track = chart.tracks[chartTrackName] = {};
                            let octaveNote = 60 + i * 12;

                            if (elt.noteNumber >= octaveNote && elt.noteNumber <= octaveNote+5 || elt.noteNumber == 116)
                            {
                                let duration = 0;
                                for (let i = index + 1; i < obj_track.length; i++)
                                {
                                    let offelt = obj_track[i];
                                    duration += offelt.deltaTime;
                                    if (offelt.noteNumber == elt.noteNumber && offelt.type == "noteOff")
                                        break;
                                }
                                let lastTrackNote = lastNote[difficulty];
                                let lastTimedTrackNote = lastTimedNote[difficulty];
                                let sinceLast = time - lastTimedTrackNote;
                                if (duration <= chart.Song.Resolution / 3 || elt.noteNumber == octaveNote+5)
                                    duration = 0;
                                if (elt.noteNumber == 116)
                                    chart.pushTrackData(track, time, {type: "S", value: 2, duration: duration});
                                else if (elt.noteNumber < octaveNote+5 || sinceLast > chart.Song.Resolution / 3 + 2)
                                {
                                    if (openNote[chartTrackName])
                                        chart.pushTrackData(track, time, {type: "N", touch: 7, duration: duration});
                                    else
                                    {
                                        if (tappingNote[chartTrackName] && lastNote[chartTrackName] != time)
                                            chart.pushTrackData(track, time, {type: "N", touch: 6, duration: 0});
                                        chart.pushTrackData(track, time, {type: "N", touch: elt.noteNumber - octaveNote, duration: duration});
                                    }

                                    if (time > lastTrackNote)
                                    {
                                        lastTimedNote[chartTrackName] = lastNote[chartTrackName];
                                        lastNote[chartTrackName] = time;
                                    }
                                }
                            }
                        }
                    }
                }
                else if (elt.type == "sysEx" && Buffer.isBuffer(elt.data))
                {
                    let data = elt.data as Buffer;
                    if (data.readUInt32LE(0) != 0x5350 || data.readUInt8(7) != 247)
                    {
                        if (!MidiChart.silent) console.warn("Unknown sysEx event at " + time + ": ", data);
                    }
                    else
                    {
                        for (let i = 0; i < difficulties.length; i++)
                        {
                            let difficulty = difficulties[i];
                            let chartTrackName = difficulty + tracksNameTranslate[trackName];

                            if (data.readUInt8(5) == 4) // tapping notes ?
                            {
                                if (data.readUInt8(4) & i) // expert ?
                                    tappingNote[chartTrackName] = data.readUInt8(6) == 1;
                            }
                            else if (data.readUInt8(5) == 1) // open notes ?
                            {
                                if (data.readUInt8(4) & i) // expert ?
                                    openNote[chartTrackName] = data.readUInt8(6) == 1;
                            }
                        }
                    }
                }
                else if (elt.type == "lyrics")
                {
                    chart.pushTrackData(chart.Events, time, {type: "E", name: "lyric " + elt.text});
                }
                else if (elt.type == "sequencerSpecific" || elt.type == "controller" || elt.type == "programChange" || elt.type == "channelPrefix")
                {
                    // skip
                }
                else if (elt.type != "endOfTrack" && elt.type != "noteOff")
                {
                    if (!MidiChart.silent) console.warn("Unknown midi elt", elt);
                }
            }
        }

        if (chart.SyncTrack[0].findIndex(elt => elt.type == "TS") == -1)
            chart.SyncTrack[0].unshift({type: "TS", value: 4});
        if (chart.SyncTrack[0].findIndex(elt => elt.type == "B") == -1)
            chart.SyncTrack[0].push({type: "B", value: 120000});

        for (let chartTrackName in chart.tracks)
        {
            for (let t in chart.tracks[chartTrackName])
            {
                if (chart.tracks[chartTrackName][t].length > 1)
                {
                    chart.tracks[chartTrackName][t] = chart.tracks[chartTrackName][t].sort((a, b) => {
                        let typea = a.type == "N" ? 0 : 1;
                        let typeb = b.type == "N" ? 0 : 1;
                        return typea - typeb;
                    });
                }
            }
        }

        for (let t in chart.Events)
        {
            if (chart.Events[t].length > 1)
            {
                chart.Events[t] = chart.Events[t].sort((a, b) => b.name.localeCompare(a.name));
            }
        }

        return chart;
    }

    private static midiToObject(content: Buffer): any
    {
        let midiobj = midi.parseMidi(content);

        return midiobj;
    }
}