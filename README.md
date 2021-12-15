## Overview

Ext.ux.grid.Printer is a Extjs library that provides a way of printing Ext Grid Component (see what is Extjs [there](https://www.sencha.com/products/extjs/#overview)).
It's a fork of https://github.com/loiane/extjs4-ux-gridprinter which is no more maintained.

This component is used in [Arhia](http://www.arhia.fr) applications and we aim to maintain it.

It's currently used in production with ExtJS Classic 7.1  

We are open to PR, if you want to contribute & send a PR, please :
- explain the problem or the feature the PR is intended to implement
- link a [Sencha Fiddle](https://fiddle.sencha.com/#home) to demonstrate the issue/feature

## Installation

Place the folder ux/grid in your project.

## Usage

In your application file, add:

```js
Ext.Loader.setConfig({enabled: true});

Ext.require([
    'Ext.ux.grid.Printer',
]);
```

Ext.ux.grid.Printer.print just take a single argument - a normal grid instance. Use it like this:

```js
var myGrid = new Ext.grid.GridPanel({
  //your usual grid config here
});

Ext.ux.grid.Printer.print(myGrid);
```

Example : https://fiddle.sencha.com/#view/editor&fiddle/1rge

### Options

You need to set the custom config before calling Ext.ux.grid.Printer.print function.

You can customize some options:

 - to disable the automatic printing (the print window will not open, user will only see the print version of the grid).

```js
Ext.ux.grid.Printer.printAutomatically = false;
```

 - to change the path of the css file.

```js
Ext.ux.grid.Printer.stylesheetPath = '/some/other/path/gridPrint.css';
```

