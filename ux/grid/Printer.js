/**
 * @class Ext.ux.grid.Printer1
 * @author Ed Spencer (edward@domine.co.uk)
 */
Ext.define('Ext.ux.grid.Printer', {
    requires: 'Ext.XTemplate',
    singleton: true,

    /**
     * Prints the passed grid.
     * Reflects on the grid's column model to build a table, and fills it using the store
     * @param {Ext.grid.Panel} grid The grid to print
     */
    print(grid) {
        // We generate an XTemplate here by using 2 intermediary
        // XTemplates - one to create the header, the other
        // to create the body (see the escaped {} below)
        let isGrouped = grid.store.isGrouped ? grid.store.isGrouped() : false;
        let groupField;
        let columns;
        let feature;

        if (isGrouped) {
            feature = this.getFeature(grid, 'grouping');
            if (feature) {
                groupField = feature.getGroupField();
            } else {
                isGrouped = false; // isGrouped turned off if grouping feature not defined
            }
        }
        if (grid.columnManager) {
            // use the column manager to get the columns.
            // var columns = grid.columnManager.getColumns(); // Not supported in ExtJS-4.1.x
            columns = grid.view.headerCt.getVisibleGridColumns();
        } else {
            // account for grouped columns
            columns = [];
            Ext.each(grid.columns, (c) => {
                if (c.items && c.items.length > 0) {
                    columns = columns.concat(c.items.items);
                } else {
                    columns.push(c);
                }
            });
        }

        // remove columns that do not contain dataIndex
        // or dataIndex is empty.
        // for example: columns filter or columns button
        const clearColumns = [];
        Ext.each(columns, (column) => {
            if (column) {
                if (!Ext.isEmpty(column.dataIndex)
                            && !column.hidden
                            && !isGrouped) {
                    clearColumns.push(column);
                } else if (column.xtype === 'rownumberer') {
                    if (!column.text) column.text = 'Row';
                    clearColumns.push(column);
                } else if (column.xtype === 'templatecolumn') {
                    clearColumns.push(column);
                } else if (isGrouped
                            && column.dataIndex !== groupField
                            && column.xtype !== 'actioncolumn') {
                    clearColumns.push(column);
                }
            }
        });
        columns = clearColumns;

        // get Styles file relative location, if not supplied
        if (this.stylesheetPath === null) {
            const scriptPath = Ext.Loader.getPath('Ext.ux.grid.Printer');
            this.stylesheetPath = `${scriptPath.substring(0, scriptPath.indexOf('Printer.js'))}gridPrinterCss/print.css`;
        }
        const headExtra = this.headExtra ? this.headExtra : '';

        // use the headerTpl and bodyTpl markups to create the main XTemplate below
        const headings = Ext.create('Ext.XTemplate', this.headerTpl).apply(columns);
        const body = this.generateBody(grid, columns, feature);
        let expanderTemplate;
        let pluginsBodyMarkup = [];

        // add relevant plugins
        Ext.each(grid.plugins, (p) => {
            if (p.ptype === 'rowexpander') {
                expanderTemplate = p.rowBodyTpl;
            }
        });

        if (expanderTemplate && !this.hideExpandedRow) {
            pluginsBodyMarkup = [
                `<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}"><td colspan="${columns.length}">`,
                '{[ this.applyTpl(values) ]}',
                '</td></tr>',
            ];
        }

        const title = (grid.title) ? grid.title : this.pageTitle;
        const summaryFeature = this.getFeature(grid, 'summary');
        const headerContent = this.headerContent ? `<div style='margin:10px;font-family:Nunito,arial;font-size:14px'>${this.headerContent}</div>` : '';

        // Here because inline styles using CSS, the browser did not show the
        // correct formatting of the data the first time that loaded
        const htmlMarkup = [
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
            `<html class="${Ext.baseCSSPrefix}ux-grid-printer">`,
            '<head>',
            '<meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />',
            `<link href="${this.stylesheetPath}" rel="stylesheet" type="text/css" />`,
            headExtra,
            `<title>${title}</title>`,
            '<script type="text/javascript">',
            'function printOnload() {["{"]}',
            `if (${this.printAutomatically}) {["{"]}`,
            'window.print();',
            `if (${this.closeAutomaticallyAfterPrint}) {["{"]}`,
            'window.close();',
            '{["}"]}',
            '{["}"]}',
            '{["}"]}',
            '</script>',
            '</head>',
            `<body class="${Ext.baseCSSPrefix}ux-grid-printer-body" onload="printOnload();">`,
            `<div class="${Ext.baseCSSPrefix}ux-grid-printer-noprint ${Ext.baseCSSPrefix}ux-grid-printer-links">`,
            `<a class="${Ext.baseCSSPrefix}ux-grid-printer-linkprint" href="javascript:void(0);" onclick="window.print();">${this.printLinkText}</a>`,
            `<a class="${Ext.baseCSSPrefix}ux-grid-printer-linkclose" href="javascript:void(0);" onclick="window.close();">${this.closeLinkText}</a>`,
            '</div>',
            '<div>',
            headerContent,
            '</div>',
            `<h1>${this.mainTitle}</h1>`,
            '<table>',
            '<tr>',
            headings,
            '</tr>',
            '<tpl for=".">',
            '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
            body,
            '</tr>',
            pluginsBodyMarkup.join(''),
            '{% if (this.isGrouped && xindex > 0) break; %}',
            '</tpl>',
            '<tpl if="this.hasSummary">',
            '<tr>',
            '<tpl for="this.columns">',
            '{[ this.renderSummary(values, xindex) ]}',
            '</tpl>',
            '</tr>',
            '</tpl>',
            '</table>',
            '</body>',
            '</html>',
            {
                isGrouped,
                grid,
                columns,
                hasSummary: Ext.isObject(summaryFeature),
                summaryFeature,
                expanderTemplate: this.hideExpandedRow ? null : expanderTemplate,
                renderColumn(column, value, rcd, col) {
                    let mutableValue = value;
                    const meta = {
                        align: column.align,
                        cellIndex: col,
                        classes: [],
                        column,
                        css: '',
                        innerCls: '',
                        record: rcd,
                        recordIndex: grid.store.indexOf ? grid.store.indexOf(rcd) : undefined,
                        style: '',
                        tdAttr: '',
                        tdCls: '',
                        unselectableAttr: 'unselectable="on"',
                        value,
                    };
                    if (column.xtype === 'templatecolumn') {
                        mutableValue = column.tpl ? column.tpl.apply(rcd.data) : value;
                    } else if (column.renderer) {
                        // these types of columns renderers expects the column
                        // itself as scope (not the grid)
                        if (column instanceof Ext.tree.Column || column.xtype === 'checkcolumn') {
                            mutableValue = column.renderer.call(
                                column,
                                value,
                                meta,
                                rcd,
                                -1,
                                col - 1,
                                this.grid.store,
                                this.grid.view,
                            );
                        } else {
                            mutableValue = column.renderer.call(
                                this.grid,
                                value,
                                meta,
                                rcd,
                                -1,
                                col - 1,
                                this.grid.store,
                                this.grid.view,
                            );
                        }
                    }

                    return this.getHtml(mutableValue, meta);
                },
                applyTpl(rcd) {
                    const html = this.expanderTemplate.apply(rcd.data);
                    return html;
                },
                renderSummary(column, colIndex) {
                    let value;
                    if (this.summaryFeature.remoteRoot) {
                        // eslint-disable-next-line new-cap
                        const summaryRecord = this.summaryFeature.summaryRecord || (new this.grid.view.store.model(null, `${this.grid.view.id}-summary-record`));
                        if (this.grid.view.store.proxy.reader.rawData) {
                            if (Ext.isArray(
                                this.grid.view.store.proxy.reader.rawData[
                                    this.summaryFeature.remoteRoot
                                ],
                            )) {
                                summaryRecord.set(
                                    this.grid.view.store.proxy.reader.rawData[
                                        this.summaryFeature.remoteRoot
                                    ][0],
                                );
                            } else {
                                summaryRecord.set(
                                    this.grid.view.store.proxy.reader.rawData[
                                        this.summaryFeature.remoteRoot
                                    ],
                                );
                            }
                        }
                        value = summaryRecord.get(column.dataIndex);
                    } else {
                        value = this.getSummary(
                            this.grid.store,
                            column.summaryType,
                            column.dataIndex,
                            false,
                        );
                    }

                    if (column.summaryRenderer) {
                        let summaryObject;
                        if (Ext.getVersion().isLessThan('4.2.0')) {
                            summaryObject = this.getSummaryObject(column.align);
                            value = column.summaryRenderer.call(
                                column,
                                value,
                                summaryObject,
                                column.dataIndex,
                            );
                            return this.getHtml(value, summaryObject);
                        }

                        const summaryRcd = this.getSummaryRecord42();
                        summaryObject = this.getSummaryObject42(
                            value,
                            column,
                            colIndex,
                            summaryRcd,
                        );
                        value = column.summaryRenderer.call(
                            this.grid,
                            value,
                            summaryObject,
                            summaryRcd,
                            -1,
                            colIndex,
                            this.grid.store,
                            this.grid.view,
                        );

                        return this.getHtml(value, summaryObject);
                    }

                    const meta = this.getSummaryObject42(column, colIndex);
                    if (value === undefined || value === 0) { return this.getHtml('&nbsp;', meta); }
                    return this.getHtml(value, meta);
                },
                getSummaryObject(align) {
                    const summaryValues = {};
                    for (let i = 0; i < columns.length; i++) {
                        const valueObject = this.getSummary(
                            this.grid.store,
                            this.columns[i].summaryType,
                            this.columns[i].dataIndex,
                            false,
                        );
                        if (valueObject) {
                            summaryValues[columns[i].id] = valueObject;
                        }
                    }
                    summaryValues.style = `text-align:${align};`;
                    return summaryValues;
                },
                getSummaryRecord42() {
                    if (this.summaryFeature.remoteRoot) {
                        // eslint-disable-next-line new-cap
                        const summaryRecord = this.summaryFeature.summaryRecord || (new this.grid.view.store.model(null, `${this.grid.view.id}-summary-record`));
                        if (this.grid.view.store.proxy.reader.rawData) {
                            if (
                                Ext.isArray(
                                    this.grid.view.store.proxy.reader.rawData[
                                        this.summaryFeature.remoteRoot
                                    ],
                                )
                            ) {
                                summaryRecord.set(
                                    this.grid.view.store.proxy.reader.rawData[
                                        this.summaryFeature.remoteRoot
                                    ][0],
                                );
                            } else {
                                summaryRecord.set(
                                    this.grid.view.store.proxy.reader.rawData[
                                        this.summaryFeature.remoteRoot
                                    ],
                                );
                            }
                        }
                        return summaryRecord;
                    }

                    const rcd = Ext.create(this.grid.store.model);
                    for (let i = 0; i < this.columns.length; i++) {
                        const valueObject = this.getSummary(
                            this.grid.store, this.columns[i].summaryType,
                            this.columns[i].dataIndex,
                            false,
                        );
                        if (valueObject) {
                            rcd.set(this.columns[i].dataIndex, valueObject);
                        }
                    }
                    return rcd;
                },
                getSummaryObject42(value, column, colIndex, rcd) {
                    return {
                        align: column.align,
                        cellIndex: colIndex,
                        column,
                        classes: [],
                        css: '',
                        innerCls: '',
                        record: rcd,
                        recordIndex: -1,
                        style: '',
                        tdAttr: '',
                        tdCls: '',
                        unselectableAttr: 'unselectable="on"',
                        value,
                    };
                },
                // Use the getSummary from Ext 4.1.3.
                // This function for 4.2.1 has been changed without updating the documentation
                // In 4.2.1, group is a group object from the store
                // (specifically grid.store.groups[i].items).
                /**
                 * Get the summary data for a field.
                 * @private
                 * @param {Ext.data.Store} store The store to get the data from
                 * @param {String/Function} type The type of aggregation.
                 * If a function is specified it will be passed to the stores aggregate function.
                 * @param {String} field The field to aggregate on
                 * @param {Boolean} group True to aggregate in grouped mode
                 * @return {Number/String/Object} See the return type for the store functions.
                 */
                getSummary(store, type, field, group) {
                    if (type) {
                        if (Ext.isFunction(type)) {
                            return store.aggregate(type, null, group, [field]);
                        }

                        switch (type) {
                            case 'count':
                                return store.count(group);
                            case 'min':
                                return store.min(field, group);
                            case 'max':
                                return store.max(field, group);
                            case 'sum':
                                return store.sum(field, group);
                            case 'average':
                                return store.average(field, group);
                            default:
                                return group ? {} : '';
                        }
                    }
                    return null;
                },
                getHtml(value, meta) {
                    let mutableValue = value;

                    if (mutableValue === undefined) { mutableValue = '&nbsp;'; }

                    let html = '<td ';
                    let tdClasses = '';
                    if (meta.tdCls) { tdClasses = meta.tdCls; }
                    if (meta.css) {
                        if (tdClasses.length > 0) { tdClasses += ` ${meta.css}`; } else { tdClasses = meta.css; }
                    }
                    if (tdClasses.length > 0) { html += `class="${tdClasses}"`; }
                    if (meta.tdAttr) { html += ` ${meta.tdAttr}`; }
                    html += '><div ';
                    if (meta.innerCls) { html += `class="${meta.innerCls}"`; }
                    html += ` style="text-align: ${meta.align};`;
                    if (meta.style) { html += meta.style; }
                    html += '" ';
                    if (meta.unselectableAttr) { html += meta.unselectableAttr; }
                    html += `>${mutableValue}</div></td>`;

                    return html;
                },
            },
        ];

        let records;
        if (grid.store instanceof Ext.data.TreeStore) {
            records = [];
            grid.store.getRootNode().cascadeBy((node) => {
                if (node.isRoot() && !grid.rootVisible) return;
                if (!node.isVisible()) return;
                records.push(node);
            }, this);
        } else {
            records = grid.store.getRange();
        }
        const html = Ext.create('Ext.XTemplate', htmlMarkup).apply(records);

        const win = window.open('', 'printgrid');

        win.document.open();
        win.document.write(html);
        win.document.close();
    },

    /**
     * @private
     * @param {Ext.grid.Panel} grid
     * @param {string} featureFType
     * @returns
     */
    getFeature(grid, featureFType) {
        const view = grid.getView();

        let features;
        if (view.features) {
            features = view.features;
        } else if (view.featuresMC) {
            features = view.featuresMC.items;
        } else if (view.normalView.featuresMC) {
            features = view.normalView.featuresMC.items;
        }

        if (features) {
            for (let i = 0; i < features.length; i++) {
                if (featureFType === 'grouping') {
                    if (features[i].ftype === 'grouping' || features[i].ftype === 'groupingsummary') { return features[i]; }
                }
                if (featureFType === 'groupingsummary') {
                    if (features[i].ftype === 'groupingsummary') { return features[i]; }
                }
                if (featureFType === 'summary') {
                    if (features[i].ftype === 'summary') { return features[i]; }
                }
            }
        }
        return undefined;
    },

    generateBody(grid, columns, feature) {
        let groups = [];
        let fields = grid.store.getProxy().getModel().getFields();
        let hideGroupField = true;
        let groupField;
        let body;
        const groupingSummaryFeature = this.getFeature(grid, 'groupingsummary');

        if (grid instanceof Ext.grid.Panel) {
            groups = grid.store.getGroups();
        }

        // if (groups.length && grid.store.isGrouped() && feature )
        if (grid.store.isGrouped() && groups && groups.length && feature) {
            hideGroupField = feature.hideGroupedHeader; // bool
            groupField = feature.getGroupField();

            let groupColumn;
            Ext.each(grid.columns, (col) => {
                if (col.dataIndex === groupField) { groupColumn = col; }
            });

            if (!feature || !fields || !groupField) {
                return;
            }

            if (hideGroupField) {
                const removeGroupField = (item) => (item.name !== groupField);
                // Remove group field from fields array.
                // This could be done later in the template,
                // but it is easier to do it here.
                fields = fields.filter(removeGroupField);
            }

            // #$%! ExtJS 5.x changed the output of getGroups().
            // It is now an Ext.util.GroupCollection object.
            // We need to transform it back into the 4.x structure which our template expects.
            if (Ext.getVersion().isGreaterThanOrEqual('5.0.0')) {
                const newGroups = [];
                for (let i = 0; i < groups.getCount(); i++) {
                    const groupObj = groups.getAt(i);
                    newGroups.push({
                        name: groupObj.getGroupKey(),
                        children: groupObj.getRange(),
                    });
                }
                groups = newGroups;
            }

            const bodyTpl = [
                '<tpl for=".">',
                '<tr class="group-header">',
                '<td colspan="{[this.colSpan]}">',
                '{[ this.applyGroupTpl(values) ]}',
                '</td>',
                '</tr>',
                '<tpl for="children">',
                '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
                '<tpl for="this.columns">',
                '{[ this.renderColumn(values, parent.get(values.dataIndex), parent, xindex) ]}',
                '</tpl>',
                '</tr>',
                '</tpl>',
                '<tpl if="this.hasSummary">',
                '<tr>',
                '<tpl for="this.columns">',
                '{[ this.renderSummary(values, xindex) ]}',
                '</tpl>',
                '</tr>',
                '</tpl>',
                '</tpl>',
                {
                    // XTemplate configuration:
                    columns,
                    groupColumn,
                    colSpan: columns.length,
                    grid,
                    groupName: '',
                    groupTpl: feature.groupHeaderTpl,
                    hasSummary: Ext.isObject(groupingSummaryFeature)
                        && groupingSummaryFeature.showSummaryRow,
                    summaryFeature: groupingSummaryFeature,
                    // XTemplate member functions:
                    childCount(c) {
                        return c.length;
                    },
                    renderColumn(column, value, rcd, col) {
                        const meta = {
                            align: column.align,
                            cellIndex: col,
                            classes: [],
                            column,
                            css: '',
                            innerCls: '',
                            record: rcd,
                            recordIndex: grid.store.indexOf(rcd),
                            style: '',
                            tdAttr: '',
                            tdCls: '',
                            unselectableAttr: 'unselectable="on"',
                            value,
                        };
                        if (column.renderer && column.xtype !== 'templatecolumn') { value = column.renderer.call(this.grid, value, meta, rcd, -1, col - 1, this.grid.store, this.grid.view); } else if (column.renderer && column.xtype == 'templatecolumn') { value = column.tpl.apply(rcd.data); }

                        return this.getHtml(value, meta);
                    },
                    getHtml(value, meta) {
                        if (value === undefined) { value = '&nbsp;'; }

                        let html = '<td ';
                        let tdClasses = '';
                        if (meta.tdCls)
                        // html += 'class="' + meta.tdCls + '"';
                        { tdClasses = meta.tdCls; }
                        if (meta.css) {
                            if (tdClasses.length > 0) { tdClasses += ` ${meta.css}`; } else { tdClasses = meta.css; }
                        }
                        if (tdClasses.length > 0) { html += `class="${tdClasses}"`; }
                        if (meta.tdAttr) { html += ` ${meta.tdAttr}`; }
                        html += '><div ';
                        if (meta.innerCls) { html += `class="${meta.innerCls}"`; }
                        html += ` style="text-align: ${meta.align};`;
                        if (meta.style) { html += meta.style; }
                        html += '" ';
                        if (meta.unselectableAttr) { html += meta.unselectableAttr; }
                        html += `>${value}</div></td>`;

                        return html;
                    },
                    renderSummary(column, colIndex) {
                        let value;
                        let summaryObject;
                        if (this.summaryFeature.remoteRoot) {
                            const summaryRecord = this.summaryFeature.summaryRecord || (new this.grid.view.store.model(null, `${this.grid.view.id}-summary-record`));
                            if (this.grid.view.store.proxy.reader.rawData) {
                                if (Ext.isArray(this.grid.view.store.proxy.reader.rawData[this.summaryFeature.remoteRoot])) { summaryRecord.set(this.getSummaryRcd(this.grid.view.store.proxy.reader.rawData[this.summaryFeature.remoteRoot], this.grid.store.groupField, this.groupName)); } else { summaryRecord.set(this.grid.view.store.proxy.reader.rawData[this.summaryFeature.remoteRoot]); }
                            }
                            value = summaryRecord.get(column.dataIndex);
                        } else {
                            value = this.getSummary(this.grid.store, column.summaryType, column.dataIndex, this.grid.store.isGrouped());
                        }

                        if (Ext.isObject(value)) { value = value[this.groupName]; }

                        if (column.summaryRenderer) {
                            if (Ext.getVersion().isLessThan('4.2.0')) {
                                value = column.summaryRenderer.call(column, value, this.getSummaryObject(column.align), column.dataIndex);
                            } else {
                                summaryObject = this.getSummaryObject42(column, colIndex);
                                value = column.summaryRenderer.call(
                                    this.grid,
                                    value,
                                    this.getSummaryObject42(column, colIndex),
                                    this.getSummaryRecord42(),
                                    -1,
                                    colIndex,
                                    this.grid.store,
                                    this.grid.view,
                                );

                                return this.getHtml(value, summaryObject);
                            }
                        } else
                        if (value == undefined || value == 0) { value = '&nbsp;'; }

                        return `<td><div>${value}</div></td>`;
                    },
                    applyGroupTpl(rcd) {
                        // The only members in rcd are name and children
                        this.groupName = rcd.name;
                        rcd.groupField = this.grid.store.groupField;

                        const meta = {
                            align: '',
                            cellIndex: -1,
                            classes: [],
                            column: this.groupColumn,
                            css: '',
                            innerCls: '',
                            record: rcd.children[0],
                            recordIndex: this.grid.store.indexOf(rcd.children[0]),
                            style: '',
                            tdAttr: '',
                            tdCls: '',
                            unselectableAttr: 'unselectable="on"',
                            value: rcd.name,
                        };

                        if (this.groupColumn) { rcd.columnName = this.groupColumn.text; } else { rcd.columnName = this.groupField; }

                        rcd.groupValue = rcd.name;

                        if (this.groupColumn && this.groupColumn.renderer) {
                            rcd.renderedGroupValue = this.groupColumn.renderer.call(this.grid, rcd.name, meta, rcd.children[0], -1, -1, this.grid.store, this.grid.view);
                        } else { rcd.renderedGroupValue = rcd.name; }
                        // rcd.rows = null;  // We don't support rcd.rows yet
                        return this.groupTpl.apply(rcd);
                    },
                    getSummaryObject(align) {
                        const summaryValues = {};
                        for (let i = 0; i < this.columns.length; i++) {
                            const valueObject = this.getSummary(this.grid.store, this.columns[i].summaryType, this.columns[i].dataIndex, this.grid.store.isGrouped());
                            if (valueObject === undefined) { continue; } // Do nothing
                            else if (Ext.isObject(valueObject)) { summaryValues[columns[i].id] = valueObject[this.groupName]; } else { summaryValues[columns[i].id] = valueObject; }
                        }
                        summaryValues.style = `text-align:${align};`;
                        return summaryValues;
                    },
                    getSummaryRecord42() {
                        const rcd = Ext.create(this.grid.store.model);
                        for (let i = 0; i < this.columns.length; i++) {
                            const valueObject = this.getSummary(this.grid.store, this.columns[i].summaryType, this.columns[i].dataIndex, this.grid.store.isGrouped());
                            if (valueObject === undefined) { continue; } // Do nothing
                            else if (Ext.isObject(valueObject)) { rcd.set(this.columns[i].dataIndex, valueObject[this.groupName]); } else { rcd.set(this.columns[i].dataIndex, valueObject); }
                        }
                        return rcd;
                    },
                    getSummaryObject42(column, colIndex) {
                        return {
                            align: column.align,
                            cellIndex: colIndex,
                            classes: [],
                            css: '',
                            innerCls: '',
                            record: this.getSummaryRecord42(),
                            recordIndex: -1,
                            style: '',
                            tdAttr: '',
                            tdCls: '',
                            unselectableAttr: 'unselectable="on"',
                            value: '&#160;',
                        };
                    },
                    // Use the getSummary from Ext 4.1.3.  This function for 4.2.1 has been changed without updating the documentation
                    // In 4.2.1, group is a group object from the store (specifically grid.store.groups[i].items).
                    /**
                         * Get the summary data for a field.
                         * @private
                         * @param {Ext.data.Store} store The store to get the data from
                         * @param {String/Function} type The type of aggregation. If a function is specified it will
                         * be passed to the stores aggregate function.
                         * @param {String} field The field to aggregate on
                         * @param {Boolean} group True to aggregate in grouped mode
                         * @return {Number/String/Object} See the return type for the store functions.
                         */
                    getSummary(store, type, field, group) {
                        if (type) {
                            if (Ext.isFunction(type)) {
                                return store.aggregate(type, null, group, [field]);
                            }

                            switch (type) {
                                case 'count':
                                    return store.count(group);
                                case 'min':
                                    return store.min(field, group);
                                case 'max':
                                    return store.max(field, group);
                                case 'sum':
                                    return store.sum(field, group);
                                case 'average':
                                    return store.average(field, group);
                                default:
                                    return group ? {} : '';
                            }
                        }
                    },

                    // return the record having fieldName == value
                    getSummaryRcd(rawDataObject, fieldName, value) {
                        if (Ext.isArray(rawDataObject)) {
                            for (let i = 0; i < rawDataObject.length; i++) {
                                if (rawDataObject[i][fieldName] && rawDataObject[i][fieldName] == value) { return rawDataObject[i]; }
                            }
                            return undefined;
                        }
                        if (rawDataObject.data[fieldName]) { return rawDataObject; }
                        return undefined;
                    },
                },
            ];

            body = Ext.create('Ext.XTemplate', bodyTpl).apply(groups);
        } else {
            const bodyTpl = [
                '<tpl for="this.columns">',
                '{[ this.renderColumn(values, parent.get(values.dataIndex), parent, xindex) ]}',
                '</tpl>',
            ];

            body = bodyTpl.join('');
        }

        return body;
    },

    /**
     * @property stylesheetPath
     * @type String
     * The path at which the print stylesheet can be found
     * (defaults to 'ux/grid/gridPrinterCss/print.css')
     */
    stylesheetPath: null,

    /**
     * @property headExtra
     * @type String
     * Additional head html eg for link
     * @example
     * "<link
    href="https://fonts.googleapis.com/css?family=Dosis:400,500,600,700,800|Nunito:400,400i,600,600i,700,700i|Roboto:400,400i,500,500i,700,700i"
    rel="stylesheet">"
     */
    headExtra: null,

    /**
     * @property printAutomatically
     * @type Boolean
     * True to open the print dialog automatically and close the window after printing.
     * False to simply open the print version
     * of the grid (defaults to false)
     */
    printAutomatically: false,

    /**
     * @property closeAutomaticallyAfterPrint
     * @type Boolean
     * True to close the window automatically after printing.
     * (defaults to false)
     */
    closeAutomaticallyAfterPrint: false,

    /**
     * @property pageTitle
     * @type String
     * Title to be used on top of the table
     * (defaults to empty)
     */
    pageTitle: 'Print View',

    /**
     * @property headerContent
     * @type String
     * html content to display on top of the table
     */
    headerContent: '',

    /**
    * @property hideExpandedRow
    * @type Boolean
    * True to disable printing of row expander template
    * (defaults to false)
    */
    hideExpandedRow: false,

    /**
     * @property mainTitle
     * @type String
     * Title to be used on top of the table
     * (defaults to empty)
     */
    mainTitle: '',

    /**
     * Text show on print link
     * @property printLinkText
     * @type String
     */
    printLinkText: 'Print',

    /**
     * Text show on close link
     * @property closeLinkText
     * @type String
     */
    closeLinkText: 'Close',

    /**
     * @property headerTpl
     * @type {Object/Array} values
     * The markup used to create the headings row.
     * By default this just uses <th> elements, override to provide your own
     */
    headerTpl: [
        '<tpl for=".">',
        '<th style="text-align: {align}">{text}</th>',
        '</tpl>',
    ],

    /**
     * @property bodyTpl
     * @type {Object/Array} values
     * The XTemplate used to create each row. This is used inside
     * the 'print' function to build another XTemplate, to which the data
     * are then applied (see the escaped dataIndex attribute here -
     * this ends up as "{dataIndex}")
     */
    bodyTpl: [
        '<tpl for="columns">',
        '\{\[ this.renderColumn(values, parent.get(values.dataIndex), parent, xindex) \]\}',
        '</tpl>',
    ],
});
