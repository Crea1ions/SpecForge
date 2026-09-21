import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 16. Rust Dioxus Mobile Brick
function sanitizeText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function tomlString(value: string | undefined): string {
  const escaped = sanitizeText(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function rsxText(value: string | undefined): string {
  const escaped = sanitizeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\{/g, '{{')
    .replace(/\}/g, '}}');
  return `"${escaped}"`;
}

function mobileFallbackIdentifier(slug: string): string {
  const segment = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `com.example.${/^[a-z]/.test(segment) ? segment : `app${segment}`}`;
}

export const rustDioxusMobileBrick: BrickDefinition = {
  id: 'rust-dioxus-mobile',
  name: 'Rust Dioxus Mobile',
  category: 'frontend',
  version: '1.0.0',
  description:
    'Application mobile Rust avec Dioxus : interface HTML/CSS écrite en Rust, affichée dans la WebView Android et iOS.',
  iconName: 'Smartphone',
  provides: ['mobile_ui', 'dioxus_ui', 'webview_frontend'],
  requires: [],
  compatibleWith: [],
  conflictsWith: ['react-vite', 'tauri-desktop'],
  options: [],
  templateFiles: [
    'Cargo.toml',
    'Dioxus.toml',
    'src/main.rs',
    'assets/main.css',
    'MOBILE.md',
  ],
  tags: ['rust', 'dioxus', 'mobile', 'android', 'ios', 'webview'],

  generateFiles: (ctx) => {
    const { project } = ctx.spec;
    const files: GeneratedFile[] = [];

    const brickId = 'rust-dioxus-mobile';
    const brickName = 'Rust Dioxus Mobile';
    const brickVersion = '1.0.0';

    const identifier =
      sanitizeText(project.identifier) || mobileFallbackIdentifier(project.slug);
    const publisher = sanitizeText(project.author) || sanitizeText(project.name);

    files.push(
      makeFile(
        'Cargo.toml',
        `[package]
name = ${tomlString(project.slug)}
version = ${tomlString(project.version)}
edition = "2021"

[dependencies]
dioxus = "0.7.10"

[features]
default = ["mobile"]
web = ["dioxus/web"]
desktop = ["dioxus/desktop"]
mobile = ["dioxus/mobile"]
`,
        'toml',
        brickId,
        brickName,
        brickVersion,
        'Manifeste Cargo avec Dioxus 0.7 (aligné sur dx 0.7.x) et feature mobile par défaut.'
      )
    );

    files.push(
      makeFile(
        'Dioxus.toml',
        `[application]

[bundle]
identifier = ${tomlString(identifier)}
publisher = ${tomlString(publisher)}
`,
        'toml',
        brickId,
        brickName,
        brickVersion,
        "Configuration dx : identifiant d'application (bundle id iOS / applicationId Android) et éditeur."
      )
    );

    files.push(
      makeFile(
        'src/main.rs',
        `use dioxus::prelude::*;

const MAIN_CSS: Asset = asset!("/assets/main.css");

#[derive(Clone, PartialEq)]
struct SubHub {
    title: &'static str,
}

#[derive(Clone, PartialEq)]
struct Hub {
    title: &'static str,
    subhubs: Vec<SubHub>,
}

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut count = use_signal(|| 0);
    let mut menu_open = use_signal(|| false);
    let mut open_hub = use_signal(|| Option::<usize>::None);

    let hubs = vec![
        Hub {
            title: "Vue d'ensemble",
            subhubs: vec![
                SubHub { title: "Tableau de bord" },
                SubHub { title: "Statistiques" },
            ],
        },
        Hub {
            title: "Services Backend",
            subhubs: vec![
                SubHub { title: "API REST" },
                SubHub { title: "Base de données" },
                SubHub { title: "Logs & Métriques" },
            ],
        },
        Hub {
            title: "Sécurité & Profil",
            subhubs: vec![
                SubHub { title: "Authentification" },
                SubHub { title: "Paramètres" },
            ],
        },
    ];

    rsx! {
        document::Link { rel: "stylesheet", href: MAIN_CSS }
        div { class: "app-shell",
            header { class: "topbar",
                button {
                    class: "icon-btn",
                    aria_label: "Ouvrir le menu",
                    onclick: move |_| menu_open.set(true),
                    "☰"
                }
                div { class: "brand",
                    span { class: "brand-dots",
                        span { class: "dot-cyan" }
                        span { class: "dot-orange" }
                    }
                    span { ${rsxText(project.name)} }
                }
                div { style: "width: 32px;" }
            }

            if *menu_open.read() {
                div { class: "drawer-overlay",
                    div { class: "drawer-header",
                        div { class: "brand",
                            span { class: "brand-dots",
                                span { class: "dot-cyan" }
                                span { class: "dot-orange" }
                            }
                            span { "Navigation" }
                        }
                        button {
                            class: "icon-btn",
                            aria_label: "Fermer le menu",
                            onclick: move |_| menu_open.set(false),
                            "✕"
                        }
                    }
                    div { class: "drawer-content",
                        for (index, hub) in hubs.iter().enumerate() {
                            div { class: "hub-group", key: "{hub.title}",
                                button {
                                    class: if open_hub.read().map_or(false, |i| i == index) { "hub-button active" } else { "hub-button" },
                                    onclick: move |_| {
                                        if open_hub.read().map_or(false, |i| i == index) {
                                            open_hub.set(None);
                                        } else {
                                            open_hub.set(Some(index));
                                        }
                                    },
                                    span { "{hub.title}" }
                                    span {
                                        if open_hub.read().map_or(false, |i| i == index) { "▲" } else { "▼" }
                                    }
                                }
                                if open_hub.read().map_or(false, |i| i == index) {
                                    div { class: "subhubs-list",
                                        for subhub in &hub.subhubs {
                                            button {
                                                class: "subhub-item",
                                                key: "{subhub.title}",
                                                onclick: move |_| menu_open.set(false),
                                                "• {subhub.title}"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            main { class: "main-content",
                section { class: "card",
                    div { class: "card-header", "Application Mobile" }
                    h2 { ${rsxText(project.name)} }
                    p { ${rsxText(project.description)} }
                }
                section { class: "card card-orange",
                    div { class: "card-header", "État & Compteur" }
                    p { "Valeur du compteur : {count}" }
                    button {
                        class: "btn-primary",
                        onclick: move |_| count += 1,
                        "Incrémenter"
                    }
                }
            }
        }
    }
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Point d\'entrée Dioxus : composant racine avec menu burger et cartes UI.'
      )
    );

    files.push(
      makeFile(
        'assets/main.css',
        `:root {
  color-scheme: dark;

  --background: #0d1117;
  --surface-1: #151b23;
  --surface-2: #1b232d;
  --surface-hover: #232d38;
  --surface-raised: #202a35;

  --text-primary: #edf3f5;
  --text-secondary: #a7b4bb;
  --text-muted: #71808a;

  --accent: #1aa8c0;
  --accent-soft: rgba(26, 168, 192, 0.12);

  --accent-orange: #f59e0b;
  --accent-orange-soft: rgba(245, 158, 11, 0.12);

  --border: rgba(255, 255, 255, 0.075);
  --border-strong: rgba(255, 255, 255, 0.12);

  --radius-card: 14px;
  --radius-control: 10px;

  font-family: Inter, system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background:
    radial-gradient(
      circle at 15% 10%,
      var(--accent-soft),
      transparent 28rem
    ),
    radial-gradient(
      circle at 90% 80%,
      var(--accent-orange-soft),
      transparent 24rem
    ),
    var(--background);
  color: var(--text-primary);
  min-height: 100vh;
  line-height: 1.5;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.topbar {
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.brand-dots {
  display: inline-flex;
  gap: 4px;
}

.dot-cyan {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--accent);
}

.dot-orange {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--accent-orange);
}

.main-content {
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--surface-raised), var(--surface-1));
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.28);
}

.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 20px;
  height: 2px;
  width: 34px;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  background: var(--accent);
}

.card-orange::before {
  background: var(--accent-orange);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 12px;
}

.card-orange .card-header {
  color: var(--accent-orange);
}

.card h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.card p {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.btn-primary {
  display: block;
  width: 100%;
  padding: 12px 16px;
  background: var(--accent-soft);
  color: var(--text-primary);
  border: 1px solid rgba(26, 168, 192, 0.3);
  border-radius: var(--radius-control);
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
  cursor: pointer;
  margin-top: 16px;
}

.btn-primary:active {
  transform: translateY(1px);
  background: var(--surface-hover);
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: var(--radius-control);
  cursor: pointer;
}

.icon-btn:active {
  background: var(--surface-2);
  color: var(--text-primary);
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-1);
}

.drawer-content {
  flex: 1;
  background: var(--surface-1);
  padding: 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hub-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hub-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
}

.hub-button.active {
  border-color: rgba(26, 168, 192, 0.4);
  background: var(--accent-soft);
  color: var(--accent);
}

.subhubs-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 12px;
  margin-top: 4px;
  border-left: 2px solid var(--border);
}

.subhub-item {
  padding: 8px 12px;
  color: var(--text-secondary);
  font-size: 0.88rem;
  border-radius: 6px;
  text-decoration: none;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
}

.subhub-item:active {
  color: var(--text-primary);
  background: var(--surface-hover);
}
`,
        'css',
        brickId,
        brickName,
        brickVersion,
        'Feuille de style thème Dark moderne pour application mobile Specforge.'
      )
    );

    files.push(
      makeFile(
        'MOBILE.md',
        `# ${sanitizeText(project.name)} : application mobile (Dioxus)

Application Rust affichée dans la WebView d'Android et d'iOS avec Dioxus 0.7. L'interface est écrite en Rust (macro §rsx!§) et stylée en CSS (§assets/main.css§).

Identifiant d'application : §${identifier}§ (section §[bundle]§ de §Dioxus.toml§).

## Outils

Installer la CLI Dioxus en version 0.7.x, comme la dépendance §dioxus§ du §Cargo.toml§ :

§§§bash
cargo install dioxus-cli --version '^0.7' --locked
dx doctor
§§§

La compilation de la CLI prend plusieurs minutes. §dx doctor§ diagnostique l'installation (Rust, WebView, Android, iOS).

### Prérequis Linux (Desktop Preview)
Si vous testez la vue desktop sous Linux (Ubuntu/Debian), installez les paquets système requis :

§§§bash
sudo apt update && sudo apt install -y build-essential pkg-config libxdo-dev libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev
§§§

## Lancer sur Android

Prérequis : Android Studio, le SDK et le NDK. §dx§ cherche le SDK dans §ANDROID_SDK_ROOT§, §ANDROID_SDK§ puis §ANDROID_HOME§, et le NDK dans §NDK_HOME§ puis §ANDROID_NDK_HOME§. À défaut, il prend le NDK le plus récent du dossier §ndk/§ du SDK. En cas d'erreur, définir §ANDROID_HOME§ et §ANDROID_NDK_HOME§.

§§§bash
dx serve --platform android
§§§

Si la cible Rust Android manque, §dx§ l'installe lui-même avec §rustup target add§.

## Lancer sur iOS

Uniquement sur macOS, avec Xcode, un SDK iOS récent et les cibles Rust §aarch64-apple-ios§ et §aarch64-apple-ios-sim§ :

§§§bash
dx serve --platform ios
§§§

## Identifiant et icône

L'identifiant se modifie dans §Dioxus.toml§. Si sa valeur est invalide (pas de point, point en début ou en fin, §..§), §dx§ retombe silencieusement sur §com.example.<nom>§. Remplacer §com.example.*§ avant toute signature ou publication.

Aucune icône n'est générée : §dx§ 0.7.10 n'utilise §[bundle] icon§ que pour les bundles de bureau, et les applications mobiles gardent l'icône par défaut de §dx§.

## Signature et publication

La signature et la publication sur les stores sont hors du périmètre de ce squelette. Elles sont obligatoires pour distribuer une application mobile.

Pour produire un artefact, §dx bundle§ compile en debug par défaut : ajouter §--release§ pour un build de distribution. §dx build --platform <cible>§ compile sans empaqueter.

§§§bash
dx bundle --platform android --release --package-types apk
dx bundle --platform ios --release --package-types ipa
§§§

Le format Android peut aussi être §aab§ (§--package-types aab§), et §--out-dir§ choisit le dossier de sortie. La configuration de la signature reste à votre charge.

## Personnalisation avancée

Permissions, §AndroidManifest.xml§ et §Info.plist§ se règlent dans §Dioxus.toml§ (sections §[permissions]§, §[android]§ et §[ios]§) : voir la documentation Dioxus 0.7.

## Intégration continue

Le workflow §.github/workflows/ci.yml§ installe les paquets système Linux requis par la WebView avant §cargo test§, car la feature §mobile§ compile aussi sur l'hôte.
`.replace(/§/g, '\x60'),
        'markdown',
        brickId,
        brickName,
        brickVersion,
        'Guide de développement mobile : outils, lancement Android et iOS, identifiant, limites.'
      )
    );

    return files;
  },
};
