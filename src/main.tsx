import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/noto-naskh-arabic/400.css';
import '@fontsource/noto-naskh-arabic/600.css';
import '@fontsource/noto-serif-devanagari/400.css';
import '@fontsource/noto-serif-devanagari/600.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
