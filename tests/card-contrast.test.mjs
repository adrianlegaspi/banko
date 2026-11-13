import test from 'node:test';
import assert from 'node:assert/strict';
import { playerColors } from '../lib/player-colors.ts';
function channels(hexadecimal) {
  return hexadecimal
    .match(/[a-f0-9]{2}/gi)
    .map((channel) => parseInt(channel, 16) / 255);
}
function luminance(colorChannels) {
  return colorChannels
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (total, channel, index) =>
        total + channel * [0.2126, 0.7152, 0.0722][index],
      0,
    );
}
for (const palette of playerColors)
  test(
    palette.label +
      ' card text meets AA contrast including decorative overlays',
    () => {
      const foreground = channels(palette.foreground);
      const background = channels(palette.background).map(
        (channel, index) => channel * 0.89 + foreground[index] * 0.11,
      );
      const luminances = [luminance(foreground), luminance(background)].sort(
        (first, second) => second - first,
      );
      const contrast = (luminances[0] + 0.05) / (luminances[1] + 0.05);
      assert.ok(contrast >= 4.5, palette.label + ' contrast ' + contrast);
    },
  );
