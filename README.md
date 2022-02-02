## Overview

Ext.ux.grid.Printer is a Extjs library that provides a way of printing Ext Grid Component (see what is Extjs [there](https://www.sencha.com/products/extjs/#overview)).
It's a fork of https://github.com/loiane/extjs4-ux-gridprinter which is no more maintained.

This component is used in [Arhia](http://www.arhia.fr) applications and we aim to maintain it.

It's currently used in production with ExtJS Classic 7.1.  

We are open to PR, if you want to contribute & send a PR, please :
- explain the problem or the feature the PR is intended to implement
- link a [Sencha Fiddle](https://fiddle.sencha.com/#home) to demonstrate the issue/feature

## Installation

Place the folder ux/grid in your project.

## Usage

It's a helper class to easily print the contents of a ExtJS grid.  
It will open a new window with a table where the first row contains the headings from your column model, and with a row for each item in your grid's store.  
When formatted with appropriate CSS it should look very similar to a default grid. 
If renderers are specified in your column model, they will be used in creating the table. Override headerTpl and bodyTpl to change how the markup is generate.  

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

You can customize some options to:

- set up page title

```js
   Ext.ux.grid.Printer.pageTitle = title;
```

- customize buttons texts

```js
Ext.ux.grid.Printer.printLinkText = "Imprimer";
Ext.ux.grid.Printer.closeLinkText = "Fermer";
```

 - disable the automatic printing (the print window will not open, user will only see the print version of the grid).

```js
Ext.ux.grid.Printer.printAutomatically = false;
```

 - change the path of the css file.

```js
Ext.ux.grid.Printer.stylesheetPath = '/some/other/path/gridPrint.css';
```

- disable printing of row expander template

```js
Ext.ux.grid.Printer.hideExpandedRow = true;
```

- add header content for a given prinf

```js
  Ext.ux.grid.Printer.headerContent = `Hey nice report`;
```

- add additional head html eg for link

```js
 Ext.ux.grid.Printer.headExtra = `
        <link
    		href="https://fonts.googleapis.com/css?family=Dosis:400,500,600,700,800|Nunito:400,400i,600,600i,700,700i|Roboto:400,400i,500,500i,700,700i"
		    rel="stylesheet">
        `;     
```

## ECMAScript version

This library is only written in ES5 (eg no const, let...) so need to transpile it for (very) old browsers, but of course it's up to you to include it in your tool chain/bundler.  
  