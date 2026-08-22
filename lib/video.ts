// Diese Datei ist die alte Adresse. Die Video-Logik liegt jetzt in
// `lib/video/youtube.ts`, zusammen mit allem, was für die Video-Publikationen
// dazugekommen ist (Vorschaubilder, Sammel-Eingabe). Der Re-Export bleibt,
// damit die bestehenden Aufrufer nicht angefasst werden müssen.
export { extractYouTubeId } from "./video/youtube";
