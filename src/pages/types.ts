/** Props every list page receives from the router. */
export interface PageProps {
  onNavigate: (route: string) => void;
}

/** A pushed detail or form page, which can also go back. */
export interface DetailPageProps {
  onNavigate: (route: string) => void;
  onBack: () => void;
}
