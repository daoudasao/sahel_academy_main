"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as CarteLeaflet, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, LocateFixed, Loader2 } from "lucide-react";

export interface Position {
  latitude: number;
  longitude: number;
}

interface Props {
  /** Position actuelle (null si aucune n'est encore choisie). */
  valeur: Position | null;
  /** Appelé quand l'admin clique sur la carte, déplace le repère ou choisit un résultat. */
  onChange: (p: Position) => void;
}

interface ResultatRecherche {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/** Centre par défaut de la carte : Bamako. */
const CENTRE_DEFAUT: [number, number] = [12.6392, -8.0029];

/** Arrondi à 6 décimales (~10 cm), largement suffisant pour un itinéraire. */
const arrondir = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Carte (OpenStreetMap, sans clé d'API) pour choisir la position d'un centre :
 * clic sur la carte, repère déplaçable, recherche d'adresse ou « Ma position ».
 */
export default function SelecteurPosition({ valeur, onChange }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteLeaflet | null>(null);
  const repere = useRef<Marker | null>(null);
  const placerRepere = useRef<((p: Position, centrer: boolean) => void) | null>(null);
  // Garde la dernière version de onChange sans recréer la carte.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [chercheEnCours, setChercheEnCours] = useState(false);
  const [messageRecherche, setMessageRecherche] = useState<string | null>(null);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);

  // Création de la carte (une seule fois). Leaflet a besoin de `window` :
  // on le charge donc côté client uniquement.
  useEffect(() => {
    let annule = false;
    let observateur: ResizeObserver | null = null;

    (async () => {
      const L = await import("leaflet");
      if (annule || !conteneur.current || carte.current) return;

      const depart = valeur
        ? ([valeur.latitude, valeur.longitude] as [number, number])
        : CENTRE_DEFAUT;
      const map = L.map(conteneur.current, {
        center: depart,
        zoom: valeur ? 16 : 12,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; contributeurs OpenStreetMap",
      }).addTo(map);

      // Icône en SVG : évite les images par défaut de Leaflet, mal résolues par le bundler.
      const icone = L.divIcon({
        className: "",
        html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 27 17 27s17-14.3 17-27C34 7.6 26.4 0 17 0z" fill="#0a2d26"/>
          <circle cx="17" cy="17" r="7" fill="#34d399"/>
        </svg>`,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
      });

      placerRepere.current = (p, centrer) => {
        const ll: [number, number] = [p.latitude, p.longitude];
        if (repere.current) {
          repere.current.setLatLng(ll);
        } else {
          repere.current = L.marker(ll, { draggable: true, icon: icone }).addTo(map);
          repere.current.on("dragend", () => {
            const pos = repere.current!.getLatLng();
            onChangeRef.current({ latitude: arrondir(pos.lat), longitude: arrondir(pos.lng) });
          });
        }
        if (centrer) map.setView(ll, Math.max(map.getZoom(), 16));
      };

      if (valeur) placerRepere.current(valeur, false);

      map.on("click", (e) => {
        const p = { latitude: arrondir(e.latlng.lat), longitude: arrondir(e.latlng.lng) };
        placerRepere.current?.(p, false);
        onChangeRef.current(p);
      });

      carte.current = map;

      // La carte est créée pendant l'animation d'ouverture de la fenêtre :
      // on recalcule sa taille dès que le conteneur change de dimensions.
      observateur = new ResizeObserver(() => map.invalidateSize());
      observateur.observe(conteneur.current);
      setTimeout(() => map.invalidateSize(), 250);
    })();

    return () => {
      annule = true;
      observateur?.disconnect();
      carte.current?.remove();
      carte.current = null;
      repere.current = null;
      placerRepere.current = null;
    };
    // Création unique : les changements de position passent par l'effet suivant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position saisie à la main dans le champ texte → on déplace le repère.
  useEffect(() => {
    if (!valeur || !placerRepere.current) return;
    const actuel = repere.current?.getLatLng();
    if (
      actuel &&
      arrondir(actuel.lat) === valeur.latitude &&
      arrondir(actuel.lng) === valeur.longitude
    ) {
      return;
    }
    placerRepere.current(valeur, true);
  }, [valeur?.latitude, valeur?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const chercher = async () => {
    const q = recherche.trim();
    if (!q) return;
    setChercheEnCours(true);
    setMessageRecherche(null);
    setResultats([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error();
      const data: ResultatRecherche[] = await res.json();
      if (data.length === 0) setMessageRecherche("Aucun lieu trouvé. Cliquez directement sur la carte.");
      setResultats(data);
    } catch {
      setMessageRecherche("Recherche indisponible. Cliquez directement sur la carte.");
    } finally {
      setChercheEnCours(false);
    }
  };

  const choisirResultat = (r: ResultatRecherche) => {
    const p = { latitude: arrondir(parseFloat(r.lat)), longitude: arrondir(parseFloat(r.lon)) };
    placerRepere.current?.(p, true);
    onChange(p);
    setResultats([]);
    setRecherche(r.display_name.split(",")[0]);
  };

  const maPosition = () => {
    if (!navigator.geolocation) {
      setMessageRecherche("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setLocalisationEnCours(true);
    setMessageRecherche(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = {
          latitude: arrondir(pos.coords.latitude),
          longitude: arrondir(pos.coords.longitude),
        };
        placerRepere.current?.(p, true);
        onChange(p);
        setLocalisationEnCours(false);
      },
      () => {
        setMessageRecherche("Position introuvable (autorisation refusée ?).");
        setLocalisationEnCours(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full h-9 pl-3 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a2d26]"
            placeholder="Rechercher un lieu (ex : ACI 2000 Bamako)"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                chercher();
              }
            }}
          />
          <button
            type="button"
            onClick={chercher}
            disabled={chercheEnCours}
            className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
            title="Rechercher"
          >
            {chercheEnCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={maPosition}
          disabled={localisationEnCours}
          className="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
          title="Utiliser ma position actuelle"
        >
          {localisationEnCours ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LocateFixed className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Ma position</span>
        </button>
      </div>

      {resultats.length > 0 && (
        <ul className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white text-xs divide-y divide-slate-100">
          {resultats.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => choisirResultat(r)}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {messageRecherche && <p className="text-[11px] text-amber-700">{messageRecherche}</p>}

      <div
        ref={conteneur}
        className="h-60 w-full rounded-xl border border-slate-200 overflow-hidden z-0"
      />
      <p className="text-[11px] text-slate-500">
        Cliquez sur la carte pour placer le centre, ou déplacez le repère.
      </p>
    </div>
  );
}
