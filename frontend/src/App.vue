<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>Fi.Fa.Kri — Badges</q-toolbar-title>
        <q-btn flat dense label="Accueil" to="/" />
        <q-btn flat dense label="Églises" to="/eglises" />
        <q-btn flat dense label="Styles matricule" to="/matricules" />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup></script>
