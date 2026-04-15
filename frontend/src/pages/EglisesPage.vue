<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Codes église (pour le matricule)</div>
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-end">
        <q-input v-model="form.nom" class="col-12 col-md-5" outlined dense label="Nom" />
        <q-input v-model="form.code" class="col-12 col-md-3" outlined dense label="Code (ex. AMRY)" maxlength="8" />
        <q-btn color="primary" label="Ajouter" :loading="saving" @click="add" />
      </q-card-section>
    </q-card>
    <q-table flat :rows="rows" :columns="columns" row-key="id" dense :loading="loading">
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat color="negative" icon="delete" @click="remove(props.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Notify } from 'quasar';
import client from '../api/client.js';

const rows = ref([]);
const loading = ref(false);
const saving = ref(false);
const form = ref({ nom: '', code: '' });

const columns = [
  { name: 'nom', label: 'Nom', field: 'nom', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await client.get('/api/eglises');
    rows.value = data;
  } finally {
    loading.value = false;
  }
}

async function add() {
  saving.value = true;
  try {
    await client.post('/api/eglises', form.value);
    form.value = { nom: '', code: '' };
    Notify.create({ type: 'positive', message: 'Église ajoutée' });
    await load();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || e.message });
  } finally {
    saving.value = false;
  }
}

async function remove(row) {
  try {
    await client.delete(`/api/eglises/${row.id}`);
    Notify.create({ type: 'positive', message: 'Supprimé' });
    await load();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || e.message });
  }
}

onMounted(load);
</script>
