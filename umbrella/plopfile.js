#!/usr/bin/env node

module.exports = function (plop) {

    const fs = require('fs');
    const shell = require('shelljs');
    const chalk = require('chalk');
    const Utils = require("../utils");
    const utils = new Utils();

    process.chdir(plop.getPlopfilePath());
    
    const getTemplate = (file) => {
        let data = fs.readFileSync(file, {
            encoding: 'base64'
        })
        return utils.fromBase64(data);
    }

    const saveData = (outputFile, data, showLog) => {
        if (!data || !outputFile) {
            return;
        }
        let base64 = utils.toBase64(data);
        if (!base64) {
            return;
        }

        let hashFromBody = utils.getHashFromText(base64);
        utils.getHashFromFile(outputFile).then((hash) => {
            if (!hash) {
                return;
            }
            let hashFromFile = utils.getHashFromText(hash);
            if (hashFromBody === hashFromFile) {
                if (showLog) {
                    console.log(chalk `{gray File the same. No need to update. }`);
                }
            } else {
                fs.writeFileSync(outputFile, data);
                if (showLog) {
                    console.log(chalk `{greenBright File saved. }`);
                }
            }
        }).catch((e) => {
            // catch the FNF
            if (e === 'FNF') {
                fs.writeFileSync(outputFile, data);
            } else {
                console.log(chalk `{red ${e}}`)
            }
        });
    }

    const renderTemplate = (template, answers) => {
        let data = plop.renderString(template, answers).replace(/&(lt|gt|quot);/g, function (m, p) {
            return (p == "lt") ? "<" : ((p == "gt") ? ">" : `"`);
        });  
        return data;  
    }

    const processAction = (answers, path) => {
        process.chdir(plop.getPlopfilePath());      
        
        // get the template
        let templateName = plop.renderString(`{{template}}`, answers);
        let cwd = plop.renderString(`{{cwd}}`, answers);
        let dryrun = plop.renderString(`{{dryrun}}`, answers);
        let name = plop.renderString(`{{name}}`, answers);
        let extension = plop.renderString(`{{extension}}`, answers);
        let templateFile = `${extension}/${templateName}.sitecore.hbs`;
        let template = getTemplate(templateFile);
        let outputDir = `${cwd}\\sitecore\\definitions\\${path}`; 
        let outputFile = `${outputDir}${name}.sitecore.${extension}`;   
        let data = renderTemplate(template, answers);    
        
        // check dir
        if (!fs.existsSync(outputDir)) {
            shell.mkdir('-p', outputDir);
        }
        // save the output                
        if (!dryrun || dryrun === 'false') {
            saveData(outputFile, data, false);
        }
    }

    plop.setGenerator('placeholders', {
        actions: [
            function customActions(answers) {
                processAction(answers, '')
            }
        ]
    });

    plop.setGenerator('component', {
        actions: [
            function customActions(answers) {
                processAction(answers, `components\\`)
            }
        ]
    });

    plop.setGenerator('template', {
        actions: [
            function customActions(answers) {
                processAction(answers, `templates\\`)
            }
        ]
    });
};
