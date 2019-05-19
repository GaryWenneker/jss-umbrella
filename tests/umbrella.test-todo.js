

test('Attempt 2', () => {
    const spy = jest.spyOn(console, 'log');
    jest.spyOn(process, 'exit').mockImplementationOnce(() => {
      throw new Error('process.exit() was called.')
    });

    expect(() => {
      require('../umbrella.js');
    }).toThrow('process.exit() was called.');
    expect(spy.mock.calls).toEqual([["ERROR: scjssconfig.json not found."]]);
    expect(process.exit).toHaveBeenCalledWith(0);
});