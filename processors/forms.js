const fs = require('fs');
const shell = require('shelljs');
const chalk = require('chalk');

exports.process = (form) => {
    console.log(chalk `{gray processing: }{white.bold ${form.name}}`);

    if (form.pages) {
        console.log(chalk `{blue Found} {white.bold ${form.pages.length}} {yellowBright page(s)}`);
        form.pages.forEach(page => {
            processPage(page);
        });
    }
}

getFieldType = (field) => {
    switch(field.type.toLowerCase()) {
        case 'input': {
            return 'string';
        }
        case 'checkbox': {
            return 'boolean';
        }
        case "number": {
            return "number";
        }
        default: {
            return 'string';
        }
    }
}

processPage = (page) => {
    let schema = {
        type: "object",
        properties: {}
    };
    let uischema = {
        type: "VerticalLayout",
        elements: []
    };

    page.sections.forEach(section => {
        processSection(section, schema, uischema);
    });

    //console.log(schema);
    //console.log(uischema);

    var cwd = process.cwd();
    let outputDir = `${cwd}\\formschema\\`;
    if (!fs.existsSync(outputDir)) {
        shell.mkdir('-p', outputDir);
    }

    let outputSchemaFile = `${outputDir}schema.json`;
    let outputUiSchemaFile = `${outputDir}uischema.json`;

    fs.writeFileSync(outputSchemaFile, JSON.stringify(schema, null, 2));
    fs.writeFileSync(outputUiSchemaFile, JSON.stringify(uischema, null, 2));
}

processSection = (section, schema, uischema) => {
    // create the section grouop
    let group = {
        id: section.id,
        type: "Group",
        //label: section.name,
        label: false,
        elements: []
    }
    // parse th fields
    if (section.fields) {
        section.fields.forEach(field => {
            let element = {
                id: field.id,
                type: getFieldType(field),
                description: field.title
            };
            schema.properties[field.name] = element;

            let uielement = {
                id: field.id,
                type: "Control",
                scope: `#/properties/${field.name}`
            }
            group.elements.push(uielement);
        });
        uischema.elements.push(group);
    }

    // recurse
    if (section.sections && section.sections.length > 0) {
        let nestedGroup = {
            state: "nested",
            type: "HorizontalLayout",
            elements: []
        };
        group.elements.push(nestedGroup);
        section.sections.forEach(childSection => {
            addSubSection(childSection, schema, nestedGroup);
        });
    }
}

addSubSection = (section, schema, group) => {
    console.log(section.name)
    Object.keys(section).forEach(key => {
        if (section[key] instanceof Array) {
            let fields = section[key];
            fields.forEach(field => {

                let element = {
                    id: field.id,
                    type: getFieldType(field),
                    description: field.title
                };
                schema.properties[field.name] = element;

                let uielement = {
                    type: "Control",
                    scope: `#/properties/${field.name}`
                }
                group.elements.push(uielement);
                
            });
        }
    });
};