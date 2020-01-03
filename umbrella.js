#!/usr/bin/env node

const path = require('path');
const request = require('request');
const yaml = require('write-yaml');
const term = require('terminal-kit').terminal;
const fs = require('fs');
const shell = require('shelljs');
const chalk = require('chalk');
const prog = require('caporal');
const nodePlop = require('node-plop');
const Utils = require("./utils.js");
const utils = new Utils();
const formProcessor = require("./processors/forms.js");


let scjssconfig = path.resolve(process.cwd(), `./scjssconfig.json`);
let routeconfig = path.resolve(process.cwd(), `./routeconfig.json`);

var config, routes;

if (fs.existsSync(scjssconfig)) {
    config = require(scjssconfig);
} else {
    console.log(chalk `{red ERROR: scjssconfig.json not found.}`);
    process.exit();
}

if (fs.existsSync(routeconfig)) {
    routes = require(routeconfig);
} else {
    console.log(chalk `{red ERROR: routeconfig.json not found.}`);
    process.exit();
}

const CommonFieldTypes = {
    SingleLineText: "Single-Line Text",
    MultiLineText: "Multi-Line Text",
    RichText: "Rich Text",
    ContentList: "Treelist",
    ItemLink: "Droptree",
    GeneralLink: "General Link",
    Image: "Image",
    File: "File",
    Number: "Number",
    Checkbox: "Checkbox",
    Date: "Date",
    DateTime: "Datetime"
}

var cwd = process.cwd();
var progressBar, progress = 0;
var dryrun = false;
var extension = 'js';

/*
  FUNCTIONS
*/
const getUmbrella = (ext, generator) => {
    // load an instance of plop from a plopfile
    var umbrellaScriptDir = path.resolve(__dirname, `umbrella`);
    // get the template directory, either the JS or TypeScript template folder
    const plop = nodePlop(`${umbrellaScriptDir}/plopfile.js`);
    // get a generator by name
    return plop.getGenerator(generator);
}
const getMetaData = () => {
    return new Promise(function (resolve, reject) {
        var uri = `${config.sitecore.layoutServiceHost}/sitecore/api/layout/render/umbrella?item=/&sc_lang=en&sc_apikey=${config.sitecore.apiKey}`;
        request(uri, {
            json: true
        }, (err, res, body) => {
            if (err) {
                console.log(chalk `{red -error-${err}}`);
                reject(err);
            }
            if (body && body.sitecore && body.sitecore.context) {
                resolve(body.sitecore.context);
            } else {
                console.log(chalk `{red No route found for ${config.sitecore.layoutServiceHost} (${uri}).}`);
                reject(null);
            }
        });
    });

}
const getRouteNames = (route) => {
    let arr = [];
    for (let lang of route.lang) {
        arr.push(`${route.path} - ${lang}`);
    }
    if (route.routes) {
        for (let subroute of route.routes) {
            let arr2 = getRouteNames(subroute);
            for (let sr of arr2) {
                arr.push(sr);
            }
        }
    }
    return arr;
}
const getForms = (lang) => {
    return new Promise(function (resolve, reject) {
        var uri = `${config.sitecore.layoutServiceHost}/sitecore/api/layout/render/umbrella?form=1&item=/&sc_lang=${lang}&sc_apikey=${config.sitecore.apiKey}`;
        request(uri, {
            json: true
        }, (err, res, body) => {
            if (err) {
                console.log(chalk `{red -error-${err}}`);
                reject(err);
            }
            if (body && body.sitecore && body.sitecore.context) {
                resolve(body.sitecore.context);
            } else {
                console.log(chalk `{red No route found for ${config.sitecore.layoutServiceHost} (${uri}).}`);
                reject(null);
            }
        });
    });
}
const saveFile = (e) => {
    let base64File = e.base64.split(';base64,').pop();
    let dataPath = './data';
    let mediaPath = `${e.mediaPath.split('/data/').pop()}.${e.extension}`;
    const outputFilePath = path.join(
        process.cwd(),
        dataPath,
        mediaPath
    );
    try {
        let mediaDir = outputFilePath.replace(`\\${e.fileName}`, '');
        if (!fs.existsSync(mediaDir)) {
            shell.mkdir('-p', mediaDir);
        }
    } catch (e) {}

    if (!dryrun) {
        if (fs.existsSync(outputFilePath)) {
            utils.getHashFromFile(outputFilePath).then((hash) => {
                let streamHash = utils.getHashFromText(base64File);
                let fileHash = utils.getHashFromText(hash);
                if (streamHash === fileHash) {
                    console.log(chalk `{gray skipped ${e.fileName}: same version.}`);
                } else {
                    writeBase64File(outputFilePath, e.fileName, base64File);
                }
            }).catch((e) => {
                console.log(chalk `{magentaBright DAMN: ${e}}`);
            });
        } else {
            writeBase64File(outputFilePath, e.fileName, base64File);
        }
    } else {
        utils.getHashFromFile(outputFilePath).then((hash) => {
            let streamHash = utils.getHashFromText(base64File);
            let fileHash = utils.getHashFromText(hash);
            if (streamHash === fileHash) {
                // do nothing
            } else {
                console.log(chalk `{magentaBright Dry run. Skipping file ${e.fileName}}`);
            }
        }).catch((e) => {});
    }
};
const writeBase64File = (outputFilePath, fileName, base64File) => {
    fs.writeFile(`${outputFilePath}`, base64File, {
        encoding: 'base64'
    }, function (res) {
        console.log(chalk `{gray ${fileName} saved}`);
    });
}
const processFields = (e) => {
    let f = {};
    Object.keys(e).forEach(p => {

        if (e[p]) {
            if (Array.isArray(e[p])) {
                // do nothing
            } else {
                // item must have a value
                if (e[p].value) {

                    if (e[p].hasOwnProperty('fields')) {
                        let val = e[p].value;
                        if (typeof val !== 'undefined') {
                            f[p] = e[p].value;
                        }
                    } else if (e[p].value.hasOwnProperty('fileName')) {

                        let image = e[p].value;
                        let mediaPath = `/data/${image.mediaPath.split('/data/').pop()}.${image.extension}`;
                        let mediaItm = {};

                        mediaItm['src'] = mediaPath;
                        mediaItm['alt'] = image.alt;

                        if (image.width) {
                            mediaItm['width'] = image.width;
                        }
                        if (image.height) {
                            mediaItm['height'] = image.height;
                        }

                        f[p] = mediaItm;
                        saveFile(e[p].value);

                        let item = e[p].value;
                        delete item.base64;
                    } else if (e[p].value.hasOwnProperty('linktype')) {
                        delete e[p].value.id;
                        f[p] = e[p].value;
                    } else {
                        f[p] = e[p].value;
                    }
                }
            }
        }
    });
    return f;
}
const processPlaceHolders = (e) => {
    let f = {};
    Object.keys(e).forEach(p => {
        f[p] = processComponent(e[p])
    });

    return f;
}
const processComponent = (e) => {
    var arr = [];
    e.forEach(c => {
        let comp = {
            componentName: c.componentName
        };
        if (c.placeholders) {
            comp.placeholders = processPlaceHolders(c.placeholders)
        }
        if (c.fields && c.fields.data && c.fields.data.datasource) {
            let fields = {};
            // get datasource fields props
            for (let prop in c.fields.data.datasource) {
                if (prop !== 'id' && prop !== 'name') {
                    for (let fieldprop in c.fields.data.datasource[prop]) {
                        if (typeof c.fields.data.datasource[prop][fieldprop] !== 'object') {
                            if (fieldprop === 'value') {
                                fields[prop] = c.fields.data.datasource[prop][fieldprop];
                                break;
                            } else {
                                delete c.fields.data.datasource[prop].jss;
                                delete c.fields.data.datasource[prop].id;
                                delete c.fields.data.datasource[prop].definition;
                                fields[prop] = c.fields.data.datasource[prop];
                            }
                        }
                    }
                }
            }
            comp.fields = fields;
        } else if (c.fields) {
            comp.fields = processFields(c.fields)
        }
        arr.push(comp);
    });
    return arr;
}
const processForms = (e) => {
    getForms('nl-NL').then(data => {
        if (data) {
            console.log(chalk `{blue Processing metadata for} {white.bold ${data.forms.length}} {yellowBright form(s)}`);
            if (data.forms.length > 0) {
                data.forms.forEach(form => {
                    formProcessor.process(form);
                });
            }            
        }
    }).catch(e => {
        console.log(chalk `{red ERROR: ${e}}`);
    })
}

const processPlaceholderManifests = (e) => {

    getMetaData().then(data => {
        if (data) {
            console.log(chalk `{blue Processing metadata for} {yellowBright placeholders}`);
            scaffoldPlaceholdersManifest(data.placeholders);
            if (dryrun) {
                console.log(chalk `{magentaBright Dry run enabled. File(s) not saved. }`)
            }
        } else {
            console.log(chalk `{red No route data found for components.}`);
        }
    }).catch(e => {
        console.log(chalk `{red ERROR: ${e}}`);
    })
}
const processTemplateManifests = (e) => {

    getMetaData().then(data => {
        if (data) {
            console.log(chalk `{blue Processing metadata for} {yellowBright templates}`);
            for (let template of data.templates) {
                scaffoldTemplateManifest(template);
            }
            if (dryrun) {
                console.log(chalk `{magentaBright Dry run enabled. File(s) not saved. }`)
            }
        } else {
            console.log(chalk `{red No route data found for templates.}`);
        }
    }).catch(e => {
        console.log(chalk `{red ERROR: ${e}}`);
    })
}
const processComponentManifests = (e) => {

    getMetaData().then(data => {
        if (data) {
            console.log(chalk `{blue Processing metadata for} {yellowBright components}`);
            for (let component of data.renderings) {
                scaffoldComponentManifest(component);
            }
            if (dryrun) {
                console.log(chalk `{magentaBright Dry run enabled. File(s) not saved. }`)
            }
        } else {
            console.log(chalk `{red No route data found for components.}`);
        }
    }).catch(e => {
        console.log(chalk `{red ERROR: ${e}}`);
    })
}

/*
  SCAFFOLDING SCRIPT
*/
function scaffoldTemplateManifest(template) {
    let fields = ``;
    let inherits = ``;
    let icon = ``;
    if (!template || !template.fields) {
        return '';
    }
    for (let field of template.fields) {
        if (!field.fromModel) {
            if (CommonFieldTypes[field.type]) {
                icon = "applicationsv2/32x32/document_plain_yellow.png";
                fields += `\t\t\t{ id: "${field.id}", name: "${field.name}", type: CommonFieldTypes.${CommonFieldTypes[field.type]} },\n`;
            }
        } else {
            icon = "apps/32x32/Umbrella.png";
            inherits += `\t\t\t"${field.templateId}", // ${field.templateName} \n`;
        }
    }
    // run all the generator actions using the data specified
    getUmbrella(extension, 'template').runActions({
        template: 'template',
        cwd: cwd,
        dryrun: dryrun,
        extension: extension,
        id: template.ID,
        name: template.Name,
        icon: icon,
        fields: fields,
        inherits: inherits
    }).then(function (results) {}).catch((e) => {});
}

function scaffoldPlaceholdersManifest(placeholders) {
    // process values
    if (placeholders.length === 0) return;
    let result = ``;
    for (let placeholder of placeholders) {
        result += `\t{ name: "${placeholder.name}", displayName: "${placeholder.displayName}", id: "${placeholder.id}" },\r`;
    }
    // run all the generator actions using the data specified
    getUmbrella(extension, 'placeholders').runActions({
        template: 'placeholders',
        cwd: cwd,
        dryrun: dryrun,
        extension: extension,
        placeholders: result,
        name: 'placeholders',
    }).then(function (results) {}).catch((e) => {});
}

function scaffoldComponentManifest(component) {
    let fields = ``;
    let placeholders = '';

    if (!component || !component.fields) {
        return '';
    }
    for (let field of component.fields) {
        fields += `\t\t\t{ id: "${field.id}", name: "${field.name}", type: ${field.type} },\n`;
    }

    for (let placeholder of component.placeholders) {
        placeholders += `\t\t\t"${placeholder.split('|')[0]}", // ${placeholder.split('|')[1]} \n`;
    }
    // run all the generator actions using the data specified
    getUmbrella(extension, 'component').runActions({
        template: 'component',
        cwd: cwd,
        dryrun: dryrun,
        extension: extension,
        id: component.id,
        name: component.name,
        icon: component.icon,
        displayName: component.displayName,
        fields: fields,
        placeholders: placeholders
    }).then(function (results) {}).catch((e) => {});
}
/*
  ACTION SCRIPT
*/

function sync() {
    var thingsToDo = getRouteNames(routes);
    var countDown = thingsToDo.length;
    var task = undefined;

    function done(task) {

        progressBar.itemDone(task);
        countDown--;

        // Cleanup and exit
        if (!countDown) {
            setTimeout(function () {
                term('\n');

                dryrun ?
                    console.log(chalk `{magentaBright Dry run. Skipped saving files. }`) :
                    console.log(chalk `{blue Done processing content. }`);
                process.exit();
            }, 200);
        }
    }

    progressBar = term.progressBar({
        width: 100,
        title: 'Importing from Sitecore:',
        eta: true,
        percent: true,
        items: thingsToDo.length
    });


    const processRoute = (route, parentRoute) => {
        if (!route) {
            return;
        }
        let parent = parentRoute || '';
        let currentRoute = (parent === '/') ? `/${route.path}` : `${parent}/${route.path}`;
        currentRoute = currentRoute.replace('//', '/');
        // process each language
        for (let lang of route.lang) {

            var uri = `${config.sitecore.layoutServiceHost}/sitecore/api/layout/render/umbrella?item=${currentRoute}&sc_lang=${lang}&sc_apikey=${config.sitecore.apiKey}`;

            requestRoute(uri, currentRoute);
        }

        // process underlying routes
        if (route.routes) {
            for (let subroute of route.routes) {
                processRoute(subroute, currentRoute);
            }
        }
    }

    const requestRoute = (uri, currentRoute) => {
        request(uri, {
            json: true
        }, (err, res, body) => {
            if (err) {
                console.log(chalk `{red -error-${err}`);
            }
            task = thingsToDo.shift();
            progressBar.startItem(task);

            if (body && body.sitecore && body.sitecore.route) {
                var data = {
                    id: body.sitecore.route.itemId
                };
                data.fields = processFields(body.sitecore.route.fields);
                data.placeholders = processPlaceHolders(body.sitecore.route.placeholders);
                if (!dryrun) {
                    yaml.sync(`./data/routes${currentRoute}/${body.sitecore.route.itemLanguage}.yml`, data);
                }
            } else {
                console.log(chalk `{red No route found for ${currentRoute}.}`);
            }
            // Finish the task in...
            setTimeout(done.bind(null, task), 500 + Math.random() * 1200);
        });
    }
    processRoute(routes);
}
/*
  PROCESSING SCRIPT
*/
prog
    .version('1.0.0')
    .description('Umbrella for Sitecore JSS')
    .help(`
        __.|.__ 
    .n887.d8'qb'""-. 
  .d88' .888  q8b. '. 
 d8P'  .8888   .88b. \\                                                                                             
d88_._ d8888_.._9888 _\\                                                                                            
  '   '    |    '   '    ____  ____  ___      ___  _______    _______    _______  ___      ___            __       
           |            (""  _||_ ""||"" \\    /"" ||   _  ""\\/""     \\  /""    ""||""|    |"" |         /""""\\      
           |            |   (  ) : | \\   \\  //   |(. |_)  :)|:        |(: ______)||  |    ||  |         /    \\     
           |            (:  |  | . ) /\\\\  \\/.    ||:     \\/ |_____/   ) \\/    |  |:  |    |:  |        /' /\\  \\    
           |             \\\\ \\__/ // |: \\.        |(|  _  \\\\  //      /  // ___)_  \\  |___  \\  |___    //  __'  \\   
           |             /\\\\ __ //\\ |.  \\    /:  ||: |_)  :)|:  __   \\ (:     ""|( \\_|:  \\( \\_|:  \\  /   /  \\\\  \\  
         '='            (__________)|___|\\__/|___|(_______/ |__|  \\___) \\_______) \\_______)\\_______)(___/    \\___) 
      
     
    Module sync between Sitecore and the developer machine.
    
    WARNING: YOUR LOCAL DATA WILL BE OVERWRITTEN. MOMENTARILY THERE'S NO CHECK FOR EXISTING ITEMS. MAKE SURE YOU HAVE A BACKUP!

    `)
    .version('1.1.0')
    .command('sync', 'Sync all data from Sitecore')
    .option('-t, --templates', 'Sync all the templates from Sitecore', prog.BOOL, false)
    .option('-p, --placeholders', 'Sync all the placeholders from Sitecore', prog.BOOL, false)
    .option('-m, --manifests', 'Sync all the component manifests from Sitecore', prog.BOOL, false)
    .option('-c, --content', 'Sync all the content from your Sitecore JSS website', prog.BOOL, false)
    .option('-f, --forms', 'Sync all the forms from your Sitecore JSS website', prog.BOOL, false)
    .option('-d, --dryrun', 'Sync but do not write to disk', prog.BOOL, false)
    .option('-x, --typescript', 'Creates manifests in TypeScript', prog.BOOL, false)
    .action(function (args, options, logger) {
        console.clear();

        if (options.typescript) {
            logger.info(chalk `{blue File format set to {yellow.bold TypeScript} }`);
            extension = 'ts';
        }
        if (options.dryrun) {
            logger.info(chalk `{yellow DRY RUN! }`);
            dryrun = true;
        }
        if (options.templates) {
            logger.info(chalk `{bold.blue Sync Sitecore {yellow templates} to your local machine}`);
            processTemplateManifests();
        }
        if (options.placeholders) {
            logger.info(chalk `{bold.blue Sync Sitecore {yellow placeholders} to your local machine}`);
            processPlaceholderManifests();
        }
        if (options.manifests) {
            logger.info(chalk `{bold.blue Sync Sitecore {yellow renderings} to your local machine}`);
            processComponentManifests();
        }
        if (options.content) {
            sync();
        }
        if (options.forms) {
            processForms();
        }
    });

prog.parse(process.argv);