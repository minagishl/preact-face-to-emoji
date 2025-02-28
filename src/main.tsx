import { render } from 'preact';
import { App } from './app.tsx';

// Import the Tailwind CSS file
import './tailwind.css';

render(<App />, document.getElementById('app')!);
