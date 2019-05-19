const Utils = require('../utils')
const fs = require('fs');
const templateHash = '247fc4ba8ae8eb32853089b9fa00cc02785cf654';

let message = 'Umbrella for Sitecore JSS is great!';
let base64Message = 'VW1icmVsbGEgZm9yIFNpdGVjb3JlIEpTUyBpcyBncmVhdCE=';

test('utils should be available', () => {
    const utils = new Utils();
    expect(utils).not.toBeNull();
});

test('toBase64 function should be available', () => {
    const utils = new Utils();
    expect(utils.toBase64).not.toBeNull();
});

test('Encode to Base64 format', () => {
    const utils = new Utils();
    let encoded = utils.toBase64(message);
    expect(encoded).toBe(base64Message);
});

test('fromBase64 function should be available', () => {
    const utils = new Utils();
    expect(utils.fromBase64).not.toBeNull();
});

test('Decode from Base64 format', () => {
    const utils = new Utils();
    let decoded = utils.fromBase64(base64Message);
    expect(decoded).toBe(message);
});

test('getHashFromText function should be available', () => {
    const utils = new Utils();
    expect(utils.getHashFromText).not.toBeNull();
});

test('getHashFromFile function should be available', () => {
    const utils = new Utils();
    expect(utils.getHashFromFile).not.toBeNull();
});

test('template typescript placeholders available', () => {
    const template = fs.existsSync('./umbrella/ts/placeholders.sitecore.hbs');
    expect(template).toBeTruthy();
});

test('getHashFromFile placeholders.sitecore.hbs', () => {
    const utils = new Utils();
    return utils.getHashFromFile('./umbrella/ts/placeholders.sitecore.hbs').then(hash => {
        let hashFromFile = utils.getHashFromText(hash);
        expect(hashFromFile).toMatch(/247fc4ba8ae8eb32853089b9fa00cc02785cf654/);
    }).catch((e) => {
        console.log(e);
    });    
});