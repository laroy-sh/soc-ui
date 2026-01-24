import { initStateFromUrl } from './outsourcer-state.js';
import { renderFilterBar } from './outsourcer-filterBar.js';
import { initRouter } from './outsourcer-router.js';

initStateFromUrl();
const filterMount = document.getElementById('filterBarMount');
if (filterMount) {
    renderFilterBar(filterMount);
}
initRouter();
