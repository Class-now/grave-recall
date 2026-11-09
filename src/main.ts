import { render, h } from 'preact';
import { App } from './app.js';

const root = document.getElementById('app');
if (root !== null) {
  render(h(App, null), root);
}
