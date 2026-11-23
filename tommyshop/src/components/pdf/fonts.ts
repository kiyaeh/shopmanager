import { Font } from '@react-pdf/renderer';

// Register Noto Sans Ethiopic for Amharic text rendering
// Font files should be placed in public/fonts/
// Download from: https://fonts.google.com/noto/specimen/Noto+Sans+Ethiopic
Font.register({
  family: 'NotoSansEthiopic',
  fonts: [
    {
      src:
        process.env.NODE_ENV === 'production'
          ? 'https://fonts.gstatic.com/s/notosansethiopic/v45/aFTO4OBnOgZYkBe3eAR7OGIlZGXoYmaBEQ.ttf'
          : '/fonts/NotoSansEthiopic-Regular.ttf',
      fontWeight: 400,
    },
    {
      src:
        process.env.NODE_ENV === 'production'
          ? 'https://fonts.gstatic.com/s/notosansethiopic/v45/aFT14OBnOgZYkBe3eAR7OGIlZGXoYmaBJQ.ttf'
          : '/fonts/NotoSansEthiopic-Bold.ttf',
      fontWeight: 700,
    },
  ],
});

export const FONT_FAMILY = 'NotoSansEthiopic';
