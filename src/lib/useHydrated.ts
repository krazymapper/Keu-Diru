import { useEffect, useState } from 'react';

/**
 * false au rendu serveur et jusqu'à l'hydratation, puis true.
 * Sert à désactiver les contrôles tant que React n'écoute pas encore :
 * sinon un clic précoce est perdu, et un formulaire part en GET natif
 * (contenu saisi exposé dans l'URL) — bug détecté par les tests E2E.
 */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
