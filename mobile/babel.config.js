module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NativeWind v4 requires this
      'nativewind/babel',
      // Resolve @shared alias in Metro bundler
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@shared': '../shared/src',
            '@': './',
          },
        },
      ],
    ],
  }
}
