Node.js: herochartio
=================

`herochartio` a chart parser and serializer from clone hero. This includes types for typescript and few helpers.

Installation
------------

    npm install herochartio

Usage
-----

```js
import { ChartIO } from 'herochartio'
```

```js
let chart = await ChartIO.load("./guitar.chart");
// or = ChartIO.parse(fs.readFileSync('./guitar.chart', 'utf-8'))

let sectionPosition = chart.findSectionPosition("Guitar solo");
let sectionTime = chart.positionToSeconds(sectionPosition);

// ...

await ChartIO.save(chart, "./guitar.chart");

```

License
-------

Licensed under MIT

Copyright (c) 2020 [Aurélie Richard](https://arichard.me)