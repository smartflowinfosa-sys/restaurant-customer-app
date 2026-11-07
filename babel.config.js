module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { reanimated: false }]],
    plugins: [
      // CRITICAL: 'react-native-reanimated/plugin' must always be the last item in plugins
      'react-native-reanimated/plugin',
    ],
  };
};

