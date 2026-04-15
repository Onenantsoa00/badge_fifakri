import { createApp } from 'vue';
import { Quasar, Notify } from 'quasar';
import quasarLang from 'quasar/lang/fr';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(Quasar, { plugins: { Notify }, lang: quasarLang });
app.use(router);
app.mount('#app');
