<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Styles de matricule</div>
    <p class="text-body2 q-mb-md">
      Segments disponibles : <code>MMYY</code> (mois/année courants), <code>EGLISE_CODE</code> (4 caractères),
      <code>TOKIM_DDMMYY</code> (date Tokim-panompoana), <code>COUNTER_3</code> (compteur unique par préfixe).
    </p>
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-end">
        <q-input v-model="nom" class="col-12 col-md-4" outlined dense label="Nom du style" />
        <q-select
          v-model="segments"
          class="col-12 col-md-6"
          outlined
          dense
          multiple
          use-chips
          :options="segmentOptions"
          label="Ordre des segments"
        />
        <q-checkbox v-model="isDefault" label="Définir par défaut" />
        <q-btn color="primary" label="Créer" :loading="saving" @click="create" />
      </q-card-section>
    </q-card>
    <q-list bordered separator>
      <q-item v-for="s in rows" :key="s.id">
        <q-item-section>
          <q-item-label>{{ s.nom }} <q-badge v-if="s.is_default" color="primary" label="défaut" /></q-item-label>
          <q-item-label caption>{{ JSON.stringify(s.segments) }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Notify } from 'quasar';
import client from '../api/client.js';

const rows = ref([]);
const nom = ref('');
const segments = ref(['MMYY', 'EGLISE_CODE', 'TOKIM_DDMMYY', 'COUNTER_3']);
const isDefault = ref(false);
const saving = ref(false);

const segmentOptions = ['MMYY', 'EGLISE_CODE', 'TOKIM_DDMMYY', 'COUNTER_3'];

async function load() {
  const { data } = await client.get('/api/matricule-styles');
  rows.value = data;
}

async function create() {
  saving.value = true;
  try {
    await client.post('/api/matricule-styles', {
      nom: nom.value || 'Nouveau style',
      segments: segments.value,
      is_default: isDefault.value,
    });
    nom.value = '';
    isDefault.value = false;
    Notify.create({ type: 'positive', message: 'Style créé' });
    await load();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || e.message });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
