import * as fse from 'fs-extra'
import * as _path from 'path'
import { ChartSync } from './ChartSync'
import { ChartEvent } from './ChartEvent'
import { Chart, ChartTrackData } from './Chart'
import { MidiChart } from './MidiChart'

export class ChartIO
{
    static moonscraper_style: boolean = true;

    static async load(path: string): Promise<Chart>
    {
        let ext = _path.extname(path).toLowerCase();

        if (ext == '.mid')
            return MidiChart.load(path);
        else if (ext == '.chart')
            return ChartIO.parse(await fse.readFile(path, 'utf-8'));
        else if (await fse.pathExists(path + '.chart'))
            return this.load(path + '.chart');
        else if (await fse.pathExists(path + '.mid'))
            return this.load(path + '.mid');

        throw new Error(`Could not find suitable chart for "${path}"`);
    }

    static async save(chart: Chart, path: string): Promise<void>
    {
        let str = ChartIO.stringify(chart);
        return fse.writeFile(path, str, 'utf-8');
    }

    static parse(content: string): Chart
    {
        let obj = ChartIO.chartToObject(content);
        let chart: Chart = new Chart();

        if (obj.Song.Name != undefined) chart.Song.Name = obj.Song.Name[0];
        if (obj.Song.Artist != undefined) chart.Song.Artist = obj.Song.Artist[0];
        if (obj.Song.ArtistText != undefined) chart.Song.ArtistText = obj.Song.ArtistText[0];
        if (obj.Song.Charter != undefined) chart.Song.Charter = obj.Song.Charter[0];
        if (obj.Song.CountOff != undefined) chart.Song.CountOff = obj.Song.CountOff[0];
        if (obj.Song.Album != undefined) chart.Song.Album = obj.Song.Album[0];
        if (obj.Song.Year != undefined) chart.Song.Year = obj.Song.Year[0];
        if (obj.Song.Offset != undefined) chart.Song.Offset = obj.Song.Offset[0];
        if (obj.Song.Resolution != undefined) chart.Song.Resolution = obj.Song.Resolution[0];
        if (obj.Song.Player2 != undefined) chart.Song.Player2 = obj.Song.Player2[0];
        if (obj.Song.Difficulty != undefined) chart.Song.Difficulty = obj.Song.Difficulty[0];
        if (obj.Song.PreviewStart != undefined) chart.Song.PreviewStart = obj.Song.PreviewStart[0];
        if (obj.Song.PreviewEnd != undefined) chart.Song.PreviewEnd = obj.Song.PreviewEnd[0];
        if (obj.Song.Genre != undefined) chart.Song.Genre = obj.Song.Genre[0];
        if (obj.Song.GuitarVol != undefined) chart.Song.GuitarVol = obj.Song.GuitarVol[0];
        if (obj.Song.BandVol != undefined) chart.Song.BandVol = obj.Song.BandVol[0];
        if (obj.Song.HoPo != undefined) chart.Song.HoPo = obj.Song.HoPo[0];
        if (obj.Song.Singer != undefined) chart.Song.Singer = obj.Song.Singer[0];
        if (obj.Song.OriginalArtist != undefined) chart.Song.OriginalArtist = obj.Song.OriginalArtist[0].toLowerCase() == "true";
        if (obj.Song.MediaType != undefined) chart.Song.MediaType = obj.Song.MediaType[0];
        if (obj.Song.MusicStream != undefined) chart.Song.MusicStream = obj.Song.MusicStream[0];
        if (obj.Song.GuitarStream != undefined) chart.Song.GuitarStream = obj.Song.GuitarStream[0];
        if (obj.Song.BassStream != undefined) chart.Song.BassStream = obj.Song.BassStream[0];
        if (obj.Song.RhythmStream != undefined) chart.Song.RhythmStream = obj.Song.RhythmStream[0];
        if (obj.Song.DrumStream != undefined) chart.Song.DrumStream = obj.Song.DrumStream[0];

        for (let ts in obj.SyncTrack)
        {
            chart.SyncTrack[parseInt(ts)] = obj.SyncTrack[ts].map((o: any) => {
                return {
                    type: o[0],
                    value: o[1]
                };
            }) as ChartSync[];
        }

        for (let ts in obj.Events)
        {
            chart.Events[parseInt(ts)] = obj.Events[ts].map((o: any) => {
                return {
                    type: o[0],
                    name: o[1]
                };
            }) as ChartEvent[];
        }

        for (let ts in obj.ExpertSingle)
        {
            chart.ExpertSingle[parseInt(ts)] = obj.ExpertSingle[ts].map((o: any) => {
                if (o[0] == 'N')
                {
                    return {
                        type: 'N',
                        touch: o[1],
                        duration: o[2],
                    };
                }
                else if (o[0] == 'E')
                {
                    return {
                        type: 'E',
                        name: o[1]
                    };
                }
                else if (o[0] == 'S')
                {
                    return {
                        type: 'S',
                        value: o[1],
                        duration: o[2],
                    };
                }
            }) as ChartTrackData[];
        }

        return chart;
    }

    static stringify(chart: Chart): string
    {
        let str = "[Song]\n";
        str += "{\n";
        if (chart.Song.Name != undefined) str += `  Name = ${JSON.stringify(chart.Song.Name)}\n`;
        if (chart.Song.Artist != undefined) str += `  Artist = ${JSON.stringify(chart.Song.Artist)}\n`;
        if (chart.Song.ArtistText != undefined) str += `  ArtistText = ${JSON.stringify(chart.Song.ArtistText)}\n`;
        if (chart.Song.Charter != undefined) str += `  Charter = ${JSON.stringify(chart.Song.Charter)}\n`;
        if (chart.Song.Album != undefined) str += `  Album = ${JSON.stringify(chart.Song.Album)}\n`;
        if (chart.Song.Year != undefined) str += `  Year = ${JSON.stringify(chart.Song.Year)}\n`;
        if (chart.Song.CountOff != undefined) str += `  CountOff = ${JSON.stringify(chart.Song.CountOff)}\n`;
        if (chart.Song.Offset != undefined) str += `  Offset = ${JSON.stringify(chart.Song.Offset)}\n`;
        if (chart.Song.Resolution != undefined) str += `  Resolution = ${JSON.stringify(chart.Song.Resolution)}\n`;
        if (chart.Song.Player2 != undefined) str += `  Player2 = ${chart.Song.Player2}\n`;
        if (chart.Song.Difficulty != undefined) str += `  Difficulty = ${JSON.stringify(chart.Song.Difficulty)}\n`;
        if (chart.Song.PreviewStart != undefined) str += `  PreviewStart = ${JSON.stringify(chart.Song.PreviewStart)}\n`;
        if (chart.Song.PreviewEnd != undefined) str += `  PreviewEnd = ${JSON.stringify(chart.Song.PreviewEnd)}\n`;
        if (chart.Song.GuitarVol != undefined) str += `  GuitarVol = ${JSON.stringify(chart.Song.GuitarVol)}\n`;
        if (chart.Song.BandVol != undefined) str += `  BandVol = ${JSON.stringify(chart.Song.BandVol)}\n`;
        if (chart.Song.HoPo != undefined) str += `  HoPo = ${JSON.stringify(chart.Song.HoPo)}\n`;
        if (chart.Song.Singer != undefined) str += `  Singer = ${JSON.stringify(chart.Song.Singer)}\n`;
        if (chart.Song.OriginalArtist != undefined) str += `  OriginalArtist = ${JSON.stringify(chart.Song.OriginalArtist)}\n`;
        if (chart.Song.Genre != undefined) str += `  Genre = ${JSON.stringify(chart.Song.Genre)}\n`;
        if (chart.Song.MediaType != undefined) str += `  MediaType = ${JSON.stringify(chart.Song.MediaType)}\n`;
        if (chart.Song.MusicStream != undefined) str += `  MusicStream = ${JSON.stringify(chart.Song.MusicStream)}\n`;
        if (chart.Song.GuitarStream != undefined) str += `  GuitarStream = ${JSON.stringify(chart.Song.GuitarStream)}\n`;
        if (chart.Song.BassStream != undefined) str += `  BassStream = ${JSON.stringify(chart.Song.BassStream)}\n`;
        if (chart.Song.RhythmStream != undefined) str += `  RhythmStream = ${JSON.stringify(chart.Song.RhythmStream)}\n`;
        if (chart.Song.DrumStream != undefined) str += `  DrumStream = ${JSON.stringify(chart.Song.DrumStream)}\n`;
        str += "}\n";
        str += "[SyncTrack]\n";
        str += "{\n";
        for (let k in chart.SyncTrack)
        {
            for (let ev of chart.SyncTrack[k])
            {
                str += `  ${k} = ${ev.type} ${ev.value}\n`;
            }
        }
        str += "}\n";
        str += "[Events]\n";
        str += "{\n";
        for (let k in chart.Events)
        {
            for (let ev of chart.Events[k])
            {
                str += `  ${k} = ${ev.type} ${JSON.stringify(ev.name)}\n`;
            }
        }
        str += "}\n";
        str += "[ExpertSingle]\n";
        str += "{\n";
        for (let k in chart.ExpertSingle)
        {
            for (let ev of chart.ExpertSingle[k])
            {
                if (ev.type == "N")
                {
                    if (ChartIO.moonscraper_style && ev.touch == 5)
                        str += `  ${k} = N ${ev.touch} ${ev.duration} \n`;
                    else
                        str += `  ${k} = N ${ev.touch} ${ev.duration}\n`;
                }
                else if (ev.type == "E")
                    str += `  ${k} = E ${ev.name}\n`;
                else if (ev.type == "S")
                    str += `  ${k} = S ${ev.value} ${ev.duration}\n`;
            }
        }
        str += "}\n";

        return str;
    }

    private static chartToObject(content: string): any
    {
        let str = content.replace(/\r/g, '').trimStart();
        str = str.replace(/\[(.*)\]\n/g, '"$1":\n');
        str = str.replace(/{\n/g, '[\n');
        str = str.replace(/}\n/g, '],\n');
        str = str.substr(0, str.length - 2);
        str = str.replace(/(\s+)(.*?) = (.*?)\n/g, ((substr, ...args) => {
            if (args[2][0] != '"' && args[2].indexOf(' ') != -1)
            {
                let subargs = args[2].match(/".*"|[^ ]+/g);
                for (let i = 0; i < subargs.length; i++)
                {
                    if (subargs[i][0] != '"' && subargs[i].search(/[^0-9]/) != -1)
                        subargs[i] = `"${subargs[i].replace(/\\/g, '\\\\')}"`;
                    else
                        subargs[i] = subargs[i].replace(/\\/g, '\\\\');
                }
                args[2] = `[${subargs.join(', ')}]`;
            }
            else if (args[2][0] != '"' && args[2].search(/[^0-9]/) != -1)
                args[2] = `"${args[2].replace(/\\/g, '\\\\')}"`;
            else
                args[2] = args[2].replace(/\\/g, '\\\\');
            return `${args[0]}["${args[1]}", ${args[2]}],\n`;
        }))
        str = str.replace(/,\s*\n\s*]/mg, "\n]");
        str = `{${str}}`;

        //console.log(str.substr(0, 340));
        let json;
        try
        {
            json = JSON.parse(str);
        }
        catch (e)
        {
            let match = e.message.match(/at position ([0-9]+)/);
            if (match)
            {
                console.log("near `" + str.substr(match[1] - 40, 40) + " <--- ERROR " + str.substr(match[1], 40) + "`");
            }
            throw e;
        }

        let charobj: any = {};
        for (let k in json)
        {
            charobj[k] = {};
            for (let prop of json[k])
            {
                if (charobj[k][prop[0]] != undefined)
                    charobj[k][prop[0]].push(prop[1]);
                else
                    charobj[k][prop[0]] = [prop[1]];
            }
        }

        return charobj;
    }
}