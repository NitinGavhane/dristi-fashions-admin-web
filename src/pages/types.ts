/** The props every page in the panel receives from the router in App.tsx. */
export interface PageProps {
  onNavigate: (route: string) => void;
  /** Opens the sidebar drawer on compact layouts. Absent on pushed form pages. */
  onMenu?: () => void;
}

/** A pushed detail/form page, which shows a back arrow instead of the hamburger. */
export interface DetailPageProps {
  onNavigate: (route: string) => void;
  onBack: () => void;
}
