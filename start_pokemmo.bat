@echo off
title 🚀 Lancement de PokeMMO (Server + Vite Client)

:: Lancer le serveur Colyseus
start cmd /k "cd server && npm run start"

:: Lancer le client Vite (ouvre déjà le navigateur)
start cmd /k "cd client && npm run dev"

exit
