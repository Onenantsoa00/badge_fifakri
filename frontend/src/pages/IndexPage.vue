<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Génération des badges</div>
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section class="text-subtitle1"
            >1. Phototype (modèle visuel)</q-card-section
          >
          <q-card-section>
            <q-file
              v-model="tplFile"
              label="Image modèle (JPG / PNG)"
              accept=".jpg,.jpeg,.png"
              outlined
              dense
            />
            <q-btn
              class="q-mt-sm"
              color="primary"
              label="Enregistrer le modèle"
              :disable="!tplFile"
              :loading="tplLoading"
              @click="uploadTemplate"
            />
            <div v-if="activeTpl" class="q-mt-sm text-caption">
              Modèle actif : {{ activeTpl.filename }} ({{
                new Date(activeTpl.uploaded_at).toLocaleString("fr-FR")
              }})
            </div>
            <div class="q-mt-xs text-caption text-grey-7">
              PDF A4 : 2×6 (12 badges), proportions allongées. Photos
              Excel/ODS en cercle dans le rond bleu.
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section class="text-subtitle1"
            >2. Photos des membres</q-card-section
          >
          <q-card-section>
            <q-file
              v-model="photoFiles"
              label="Photos (JPG / PNG) — une ou plusieurs"
              accept=".jpg,.jpeg,.png,.webp"
              outlined
              dense
              multiple
              use-chips
            />
            <q-btn
              class="q-mt-sm"
              color="primary"
              label="Envoyer les photos sur le serveur"
              :disable="!photoFiles?.length"
              :loading="photoLoading"
              @click="uploadPhotos"
            />
            <div v-if="uploadedPhotosCount" class="q-mt-sm text-caption text-positive">
              {{ uploadedPhotosCount }} photo(s) disponible(s) sur le serveur.
            </div>
            <div class="text-caption q-mt-sm text-grey-7">
              <strong>Étape obligatoire en production.</strong> Uploadez d'abord
              les photos ici. Dans Excel, colonne <strong>Photo</strong> : mettez
              le <strong>nom du fichier</strong> (ex. <code>12.jpeg</code>) ou le
              chemin serveur <code>uploads/photos/12.jpeg</code>. Les chemins
              locaux (<code>/home/...</code>) ne fonctionnent pas en production.
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section class="text-subtitle1"
            >3. Fichier Excel</q-card-section
          >
          <q-card-section>
            <q-file
              v-model="xlsFile"
              label="Liste membres (.xlsx / .ods)"
              accept=".xlsx,.xls,.ods"
              outlined
              dense
            />
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
            <q-btn
              class="q-mt-sm"
              color="secondary"
              text-color="dark"
              label="Importer"
              :disable="!xlsFile"
              :loading="impLoading"
              @click="importExcel"
            />
            <div class="text-caption q-mt-sm">
              Colonnes attendues : <strong>Nom</strong>,
              <strong>Prénoms</strong>, <strong>Eglizy</strong>,
              <strong>Tokim-panompoana</strong>, optionnellement Distrika,
              Matricule (manuel), Photo (nom du fichier uploadé).
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="q-mt-md">
      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle1">4. Membres et PDF</div>
        <div class="q-gutter-sm">
          <q-btn
            outline
            color="primary"
            label="Rafraîchir"
            :loading="listLoading"
            @click="loadMembres"
          />
          <q-btn
            outline
            color="negative"
            label="Vider"
            :disable="!membres.length || clearLoading"
            :loading="clearLoading"
            @click="clearMembres"
          />
          <q-btn
            color="primary"
            icon="picture_as_pdf"
            label="Générer le PDF"
            :disable="!membres.length"
            :loading="pdfLoading"
            @click="downloadPdf"
          />
        </div>
      </q-card-section>
      <q-table
        flat
        :rows="membres"
        :columns="columns"
        row-key="id"
        dense
        :loading="listLoading"
      >
        <template #body-cell-photo_lien="props">
          <q-td :props="props">
            <div class="row items-center no-wrap q-gutter-xs">
              <q-avatar v-if="photoPreviewUrl(props.row.photo_lien)" size="32px">
                <img :src="photoPreviewUrl(props.row.photo_lien)" alt="" />
              </q-avatar>
              <q-icon v-else name="image_not_supported" color="grey-5" size="sm" />
              <q-btn
                dense
                flat
                round
                icon="upload"
                size="sm"
                @click="openPhotoUpload(props.row)"
              />
            </div>
          </q-td>
        </template>
        <template #body-cell-matricule="props">
          <q-td :props="props">
            <span>{{ props.row.matricule }}</span>
            <q-btn
              dense
              flat
              round
              icon="edit"
              size="sm"
              @click="openEdit(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="photoOpen">
      <q-card style="min-width: 360px">
        <q-card-section class="text-h6">Photo du membre</q-card-section>
        <q-card-section>
          <div v-if="photoEditRow" class="text-caption q-mb-sm">
            {{ photoEditRow.nom }} {{ photoEditRow.prenoms }}
          </div>
          <q-file
            v-model="photoEditFile"
            label="Image (JPG / PNG)"
            accept=".jpg,.jpeg,.png,.webp"
            outlined
            dense
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Enregistrer"
            :disable="!photoEditFile"
            :loading="photoEditLoading"
            @click="saveMemberPhoto"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="editOpen">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Modifier le matricule</q-card-section>
        <q-card-section>
          <q-input v-model="editMatricule" outlined dense label="Matricule" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Enregistrer"
            :loading="saveLoading"
            @click="saveMatricule"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { Notify } from "quasar";
import client from "../api/client.js";

const tplFile = ref(null);
const xlsFile = ref(null);
const photoFiles = ref(null);
const tplLoading = ref(false);
const impLoading = ref(false);
const photoLoading = ref(false);
const uploadedPhotosCount = ref(0);
const listLoading = ref(false);
const pdfLoading = ref(false);
const membres = ref([]);
const activeTpl = ref(null);
const styles = ref([]);
const styleId = ref(null);

const styleOptions = computed(() => styles.value);

const columns = [
  { name: "nom", label: "Nom", field: "nom", align: "left" },
  { name: "prenoms", label: "Prénoms", field: "prenoms", align: "left" },
  { name: "eglizy", label: "Eglizy", field: "eglizy", align: "left" },
  { name: "distrika", label: "Distrika", field: "distrika", align: "left" },
  {
    name: "tokim_panompoana",
    label: "Tokim",
    field: "tokim_panompoana",
    align: "left",
  },
  { name: "matricule", label: "Matricule", field: "matricule", align: "left" },
  {
    name: "photo_lien",
    label: "Photo",
    field: "photo_lien",
    align: "left",
  },
];

const editOpen = ref(false);
const editRow = ref(null);
const editMatricule = ref("");
const saveLoading = ref(false);
const clearLoading = ref(false);

const photoOpen = ref(false);
const photoEditRow = ref(null);
const photoEditFile = ref(null);
const photoEditLoading = ref(false);

function photoPreviewUrl(photoLien) {
  if (!photoLien) return null;
  if (photoLien.startsWith("http://") || photoLien.startsWith("https://")) {
    return photoLien;
  }
  return photoLien.startsWith("/") ? photoLien : `/${photoLien}`;
}

async function loadStyles() {
  const { data } = await client.get("/api/matricule-styles");
  styles.value = data;
  const def = data.find((s) => s.is_default);
  if (def) styleId.value = def.id;
}

async function loadActiveTpl() {
  const { data } = await client.get("/api/templates/active");
  activeTpl.value = data;
}

async function loadMembres() {
  listLoading.value = true;
  try {
    const { data } = await client.get("/api/membres");
    membres.value = data;
  } finally {
    listLoading.value = false;
  }
}

async function uploadPhotos() {
  if (!photoFiles.value?.length) return;
  photoLoading.value = true;
  try {
    const fd = new FormData();
    for (const f of photoFiles.value) {
      fd.append("photos", f);
    }
    const { data } = await client.post("/api/photos/bulk", fd);
    uploadedPhotosCount.value += data.uploaded;
    photoFiles.value = null;
    Notify.create({
      type: "positive",
      message: `${data.uploaded} photo(s) envoyée(s) sur le serveur`,
    });
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.error || e.message,
    });
  } finally {
    photoLoading.value = false;
  }
}

function openPhotoUpload(row) {
  photoEditRow.value = row;
  photoEditFile.value = null;
  photoOpen.value = true;
}

async function saveMemberPhoto() {
  if (!photoEditRow.value || !photoEditFile.value) return;
  photoEditLoading.value = true;
  try {
    const fd = new FormData();
    fd.append("photo", photoEditFile.value);
    const { data } = await client.post("/api/photos", fd);
    await client.patch(`/api/membres/${photoEditRow.value.id}`, {
      photo_lien: data.path,
    });
    Notify.create({ type: "positive", message: "Photo enregistrée" });
    photoOpen.value = false;
    await loadMembres();
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.error || e.message,
    });
  } finally {
    photoEditLoading.value = false;
  }
}

async function uploadTemplate() {
  if (!tplFile.value) return;
  tplLoading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", tplFile.value);
    const { data } = await client.post("/api/templates", fd);
    activeTpl.value = data;
    tplFile.value = null;
    Notify.create({ type: "positive", message: "Modèle enregistré" });
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.error || e.message,
    });
  } finally {
    tplLoading.value = false;
  }
}

async function importExcel() {
  if (!xlsFile.value) return;
  impLoading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", xlsFile.value);
    if (styleId.value) fd.append("matricule_style_id", String(styleId.value));
    const { data } = await client.post("/api/membres/import-excel", fd);
    if (data.errors?.length) {
      Notify.create({
        type: "warning",
        message: `${data.inserted} importé(s), ${data.errors.length} erreur(s). Voir la console.`,
        timeout: 5000,
      });
      console.warn(data.errors);
    } else {
      Notify.create({
        type: "positive",
        message: `${data.inserted} membre(s) importé(s)`,
      });
    }
    xlsFile.value = null;
    await loadMembres();
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.error || e.message,
    });
  } finally {
    impLoading.value = false;
  }
}

async function clearMembres() {
  if (!membres.value.length) return;
  if (
    !window.confirm(
      "Supprimer tous les membres importés ? Cette action est irréversible.",
    )
  )
    return;
  clearLoading.value = true;
  try {
    await client.delete("/api/membres");
    Notify.create({ type: "positive", message: "Données membres supprimées" });
    await loadMembres();
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.error || e.message,
    });
  } finally {
    clearLoading.value = false;
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
    await client.patch(`/api/membres/${editRow.value.id}`, {
      matricule: editMatricule.value,
    });
    Notify.create({ type: "positive", message: "Matricule mis à jour" });
    editOpen.value = false;
    await loadMembres();
  } catch (e) {
    Notify.create({
      type: "negative",
      message: e.response?.data?.error || e.message,
    });
  } finally {
    saveLoading.value = false;
  }
}

async function downloadPdf() {
  pdfLoading.value = true;
  try {
    const res = await client.post(
      "/api/badges/pdf",
      { ids: null },
      { responseType: "blob" },
    );
    const url = window.URL.createObjectURL(
      new Blob([res.data], { type: "application/pdf" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `badges_fifakri_${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    Notify.create({ type: "positive", message: "PDF téléchargé" });
  } catch (e) {
    Notify.create({ type: "negative", message: e.message });
  } finally {
    pdfLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadStyles(), loadActiveTpl(), loadMembres()]);
  } catch (e) {
    Notify.create({
      type: "negative",
      message: "API injoignable. Lancez le backend et PostgreSQL.",
    });
  }
});
</script>
