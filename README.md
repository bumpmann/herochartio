Node.js: herochartio
=================

`herochartio` a chart parser and serializer from clone hero. This includes types for typescript and few helpers. This also supports mid charts parsing.

Installation
------------

    npm install herochartio

Usage
-----

```js
import { ChartIO } from 'herochartio'
```

```js
let chart = await ChartIO.load("./notes"); // load .chart or .mid

let sectionPosition = chart.findSectionPosition("Guitar solo");
let sectionTime = chart.positionToSeconds(sectionPosition);

// ...

await ChartIO.save(chart, "./guitar.chart");

```

License
-------

Licensed under MIT

Copyright (c) 2020 [Aurélie Richard](https://arichard.me)