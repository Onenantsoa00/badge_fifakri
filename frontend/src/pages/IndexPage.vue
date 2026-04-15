<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Génération des badges</div>
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section class="text-subtitle1">1. Phototype (modèle visuel)</q-card-section>
          <q-card-section>
            <q-file v-model="tplFile" label="Image modèle (JPG / PNG)" accept=".jpg,.jpeg,.png" outlined dense />
            <q-btn class="q-mt-sm" color="primary" label="Enregistrer le modèle" :disable="!tplFile" :loading="tplLoading" @click="uploadTemplate" />
            <div v-if="activeTpl" class="q-mt-sm text-caption">
              Modèle actif : {{ activeTpl.filename }} ({{ new Date(activeTpl.uploaded_at).toLocaleString('fr-FR') }})
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section class="text-subtitle1">2. Fichier Excel</q-card-section>
          <q-card-section>
            <q-file v-model="xlsFile" label="Liste membres (.xlsx)" accept=".xlsx,.xls" outlined dense />
            <q-select
              v-model="styleId"
              :options="styleOptions"
              option-value="id"
              option-label="nom"
              emit-value
              map-options
              label="Style de matricule"
              outlined
              dense
              clearable
              class="q-mt-sm"
            />
            <q-btn class="q-mt-sm" color="secondary" text-color="dark" label="Importer" :disable="!xlsFile" :loading="impLoading" @click="importExcel" />
            <div class="text-caption q-mt-sm">
              Colonnes attendues : <strong>Nom</strong>, <strong>Prénoms</strong>, <strong>Eglizy</strong>, <strong>Tokim-panompoana</strong>,
              optionnellement Distrika, Matricule (manuel), Photo / lien image.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="q-mt-md">
      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle1">3. Membres et PDF</div>
        <div class="q-gutter-sm">
          <q-btn outline color="primary" label="Rafraîchir" :loading="listLoading" @click="loadMembres" />
          <q-btn color="primary" icon="picture_as_pdf" label="Générer le PDF" :disable="!membres.length" :loading="pdfLoading" @click="downloadPdf" />
        </div>
      </q-card-section>
      <q-table flat :rows="membres" :columns="columns" row-key="id" dense :loading="listLoading">
        <template #body-cell-matricule="props">
          <q-td :props="props">
            <span>{{ props.row.matricule }}</span>
            <q-btn dense flat round icon="edit" size="sm" @click="openEdit(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="editOpen">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Modifier le matricule</q-card-section>
        <q-card-section>
          <q-input v-model="editMatricule" outlined dense label="Matricule" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Enregistrer" :loading="saveLoading" @click="saveMatricule" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { Notify } from 'quasar';
import client from '../api/client.js';

const tplFile = ref(null);
const xlsFile = ref(null);
const tplLoading = ref(false);
const impLoading = ref(false);
const listLoading = ref(false);
const pdfLoading = ref(false);
const membres = ref([]);
const activeTpl = ref(null);
const styles = ref([]);
const styleId = ref(null);

const styleOptions = computed(() => styles.value);

const columns = [
  { name: 'nom', label: 'Nom', field: 'nom', align: 'left' },
  { name: 'prenoms', label: 'Prénoms', field: 'prenoms', align: 'left' },
  { name: 'eglizy', label: 'Eglizy', field: 'eglizy', align: 'left' },
  { name: 'distrika', label: 'Distrika', field: 'distrika', align: 'left' },
  { name: 'tokim_panompoana', label: 'Tokim', field: 'tokim_panompoana', align: 'left' },
  { name: 'matricule', label: 'Matricule', field: 'matricule', align: 'left' },
];

const editOpen = ref(false);
const editRow = ref(null);
const editMatricule = ref('');
const saveLoading = ref(false);

async function loadStyles() {
  const { data } = await client.get('/api/matricule-styles');
  styles.value = data;
  const def = data.find((s) => s.is_default);
  if (def) styleId.value = def.id;
}

async function loadActiveTpl() {
  const { data } = await client.get('/api/templates/active');
  activeTpl.value = data;
}

async function loadMembres() {
  listLoading.value = true;
  try {
    const { data } = await client.get('/api/membres');
    membres.value = data;
  } finally {
    listLoading.value = false;
  }
}

async function uploadTemplate() {
  if (!tplFile.value) return;
  tplLoading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', tplFile.value);
    const { data } = await client.post('/api/templates', fd);
    activeTpl.value = data;
    tplFile.value = null;
    Notify.create({ type: 'positive', message: 'Modèle enregistré' });
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || e.message });
  } finally {
    tplLoading.value = false;
  }
}

async function importExcel() {
  if (!xlsFile.value) return;
  impLoading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', xlsFile.value);
    if (styleId.value) fd.append('matricule_style_id', String(styleId.value));
    const { data } = await client.post('/api/membres/import-excel', fd);
    if (data.errors?.length) {
      Notify.create({
        type: 'warning',
        message: `${data.inserted} importé(s), ${data.errors.length} erreur(s). Voir la console.`,
        timeout: 5000,
      });
      console.warn(data.errors);
    } else {
      Notify.create({ type: 'positive', message: `${data.inserted} membre(s) importé(s)` });
    }
    xlsFile.value = null;
    await loadMembres();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || e.message });
  } finally {
    impLoading.value = false;
  }
}

function openEdit(row) {
  editRow.value = row;
  editMatricule.value = row.matricule;
  editOpen.value = true;
}

async function saveMatricule() {
  if (!editRow.value) return;
  saveLoading.value = true;
  try {
    await client.patch(`/api/membres/${editRow.value.id}`, { matricule: editMatricule.value });
    Notify.create({ type: 'positive', message: 'Matricule mis à jour' });
    editOpen.value = false;
    await loadMembres();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || e.message });
  } finally {
    saveLoading.value = false;
  }
}

async function downloadPdf() {
  pdfLoading.value = true;
  try {
    const res = await client.post(
      '/api/badges/pdf',
      { ids: null },
      { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `badges_fifakri_${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    Notify.create({ type: 'positive', message: 'PDF téléchargé' });
  } catch (e) {
    Notify.create({ type: 'negative', message: e.message });
  } finally {
    pdfLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadStyles(), loadActiveTpl(), loadMembres()]);
  } catch (e) {
    Notify.create({ type: 'negative', message: 'API injoignable. Lancez le backend et PostgreSQL.' });
  }
});
</script>
