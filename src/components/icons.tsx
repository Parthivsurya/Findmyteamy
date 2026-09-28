import {
  ArrowRight,
  ArrowSquareOut,
  Bell,
  CalendarBlank,
  Check,
  Clock,
  FunnelSimple,
  Gear,
  GithubLogo,
  Globe,
  GoogleLogo,
  LinkedinLogo,
  Link as LinkGlyph,
  List,
  MagnifyingGlass,
  MapPin,
  Moon,
  PencilSimple,
  Plus,
  SealCheck,
  ShieldCheck,
  SignOut,
  Sparkle,
  Stack,
  Sun,
  Trophy,
  Tray,
  Users,
  X,
} from "@phosphor-icons/react/ssr";
// Types only, so this import is erased at build time and pulls in no context.
import type { Icon as PhosphorIcon, IconProps } from "@phosphor-icons/react/lib";

/**
 * Every glyph in the app, from one family.
 *
 * These used to be hand-drawn SVG paths. Hand-rolled icons are the reason an
 * interface looks slightly wrong in a way nobody can name: the optical weights
 * disagree, a 24px grid icon sits next to a 20px one, and corner radii drift.
 * Phosphor is drawn on one grid at one weight, so a row of icons lines up.
 *
 * Imported from the `/ssr` entry, which carries no React context, so these
 * render inside Server Components as well as client ones.
 *
 * The names are kept exactly as they were, so the thirty call sites did not
 * have to change. Where Phosphor's name is clearer it is noted below.
 */

/** One weight for the whole app. Mixing weights is what makes a toolbar noisy. */
const WEIGHT: IconProps["weight"] = "regular";

function glyph(Source: PhosphorIcon) {
  function Glyph({ className, ...props }: IconProps) {
    return (
      <Source
        aria-hidden="true"
        weight={WEIGHT}
        className={className ?? "size-4"}
        {...props}
      />
    );
  }
  Glyph.displayName = `Icon(${Source.displayName ?? "glyph"})`;
  return Glyph;
}

export const SearchIcon = glyph(MagnifyingGlass);
export const UsersIcon = glyph(Users);
export const CalendarIcon = glyph(CalendarBlank);
export const TrophyIcon = glyph(Trophy);
export const CheckIcon = glyph(Check);
export const XIcon = glyph(X);
export const PlusIcon = glyph(Plus);
export const ArrowRightIcon = glyph(ArrowRight);
export const BellIcon = glyph(Bell);
export const ClockIcon = glyph(Clock);
export const EditIcon = glyph(PencilSimple);
export const ExternalIcon = glyph(ArrowSquareOut);
export const FilterIcon = glyph(FunnelSimple);
export const GithubIcon = glyph(GithubLogo);
export const GlobeIcon = glyph(Globe);
export const GoogleIcon = glyph(GoogleLogo);
/** An empty inbox. Phosphor calls the shape a tray. */
export const InboxIcon = glyph(Tray);
export const LayersIcon = glyph(Stack);
export const LinkIcon = glyph(LinkGlyph);
export const LinkedinIcon = glyph(LinkedinLogo);
export const LogoutIcon = glyph(SignOut);
export const MapPinIcon = glyph(MapPin);
export const MenuIcon = glyph(List);
export const MoonIcon = glyph(Moon);
export const SettingsIcon = glyph(Gear);
export const ShieldIcon = glyph(ShieldCheck);
export const SparklesIcon = glyph(Sparkle);
export const SunIcon = glyph(Sun);
/** A verified achievement. Phosphor's seal reads as a stamp, which is right. */
export const VerifiedIcon = glyph(SealCheck);
