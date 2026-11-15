// Icons: Phosphor only (one family, three weights). Never hand-draw a path; add the import here instead.
//   <Icon name="barbell" />                      regular, 24px, currentColor
//   <Icon name="house" weight="fill" size={26} />  fill = active/selected, bold = small glyphs inside controls
//   <PointsGlyph size={18} />                    the points coin; use it wherever points appear
// build.mjs loads .svg imports as text; only the icons imported below ship in the bundle.
import { h } from 'preact';

import House from '@phosphor-icons/core/assets/regular/house.svg';
import Barbell from '@phosphor-icons/core/assets/regular/barbell.svg';
import Storefront from '@phosphor-icons/core/assets/regular/storefront.svg';
import ChartBar from '@phosphor-icons/core/assets/regular/chart-bar.svg';
import Books from '@phosphor-icons/core/assets/regular/books.svg';
import Plus from '@phosphor-icons/core/assets/regular/plus.svg';
import Minus from '@phosphor-icons/core/assets/regular/minus.svg';
import X from '@phosphor-icons/core/assets/regular/x.svg';
import Check from '@phosphor-icons/core/assets/regular/check.svg';
import CaretLeft from '@phosphor-icons/core/assets/regular/caret-left.svg';
import CaretRight from '@phosphor-icons/core/assets/regular/caret-right.svg';
import CaretDown from '@phosphor-icons/core/assets/regular/caret-down.svg';
import CaretUp from '@phosphor-icons/core/assets/regular/caret-up.svg';
import DotsThree from '@phosphor-icons/core/assets/regular/dots-three.svg';
import ArrowUp from '@phosphor-icons/core/assets/regular/arrow-up.svg';
import ArrowDown from '@phosphor-icons/core/assets/regular/arrow-down.svg';
import ArrowRight from '@phosphor-icons/core/assets/regular/arrow-right.svg';
import ArrowUpRight from '@phosphor-icons/core/assets/regular/arrow-up-right.svg';
import ArrowsDownUp from '@phosphor-icons/core/assets/regular/arrows-down-up.svg';
import ArrowsOut from '@phosphor-icons/core/assets/regular/arrows-out.svg';
import ArrowsOutCardinal from '@phosphor-icons/core/assets/regular/arrows-out-cardinal.svg';
import ArrowClockwise from '@phosphor-icons/core/assets/regular/arrow-clockwise.svg';
import ArrowCounterClockwise from '@phosphor-icons/core/assets/regular/arrow-counter-clockwise.svg';
import ArrowsClockwise from '@phosphor-icons/core/assets/regular/arrows-clockwise.svg';
import FastForward from '@phosphor-icons/core/assets/regular/fast-forward.svg';
import Timer from '@phosphor-icons/core/assets/regular/timer.svg';
import Clock from '@phosphor-icons/core/assets/regular/clock.svg';
import CalendarBlank from '@phosphor-icons/core/assets/regular/calendar-blank.svg';
import Fire from '@phosphor-icons/core/assets/regular/fire.svg';
import Trophy from '@phosphor-icons/core/assets/regular/trophy.svg';
import Medal from '@phosphor-icons/core/assets/regular/medal.svg';
import Lightning from '@phosphor-icons/core/assets/regular/lightning.svg';
import Sparkle from '@phosphor-icons/core/assets/regular/sparkle.svg';
import Star from '@phosphor-icons/core/assets/regular/star.svg';
import TrendUp from '@phosphor-icons/core/assets/regular/trend-up.svg';
import Ranking from '@phosphor-icons/core/assets/regular/ranking.svg';
import Users from '@phosphor-icons/core/assets/regular/users.svg';
import User from '@phosphor-icons/core/assets/regular/user.svg';
import UserCircle from '@phosphor-icons/core/assets/regular/user-circle.svg';
import Heart from '@phosphor-icons/core/assets/regular/heart.svg';
import ChatCircle from '@phosphor-icons/core/assets/regular/chat-circle.svg';
import ShareNetwork from '@phosphor-icons/core/assets/regular/share-network.svg';
import Export from '@phosphor-icons/core/assets/regular/export.svg';
import Copy from '@phosphor-icons/core/assets/regular/copy.svg';
import Bell from '@phosphor-icons/core/assets/regular/bell.svg';
import Gear from '@phosphor-icons/core/assets/regular/gear.svg';
import Palette from '@phosphor-icons/core/assets/regular/palette.svg';
import SlidersHorizontal from '@phosphor-icons/core/assets/regular/sliders-horizontal.svg';
import Flask from '@phosphor-icons/core/assets/regular/flask.svg';
import Coins from '@phosphor-icons/core/assets/regular/coins.svg';
import Infinity from '@phosphor-icons/core/assets/regular/infinity.svg';
import Sun from '@phosphor-icons/core/assets/regular/sun.svg';
import Moon from '@phosphor-icons/core/assets/regular/moon.svg';
import CircleHalf from '@phosphor-icons/core/assets/regular/circle-half.svg';
import DeviceMobile from '@phosphor-icons/core/assets/regular/device-mobile.svg';
import Trash from '@phosphor-icons/core/assets/regular/trash.svg';
import Archive from '@phosphor-icons/core/assets/regular/archive.svg';
import Package from '@phosphor-icons/core/assets/regular/package.svg';
import PencilSimple from '@phosphor-icons/core/assets/regular/pencil-simple.svg';
import NotePencil from '@phosphor-icons/core/assets/regular/note-pencil.svg';
import Play from '@phosphor-icons/core/assets/regular/play.svg';
import Pause from '@phosphor-icons/core/assets/regular/pause.svg';
import Stop from '@phosphor-icons/core/assets/regular/stop.svg';
import MagnifyingGlass from '@phosphor-icons/core/assets/regular/magnifying-glass.svg';
import Funnel from '@phosphor-icons/core/assets/regular/funnel.svg';
import ListBullets from '@phosphor-icons/core/assets/regular/list-bullets.svg';
import Tag from '@phosphor-icons/core/assets/regular/tag.svg';
import Lock from '@phosphor-icons/core/assets/regular/lock.svg';
import LockOpen from '@phosphor-icons/core/assets/regular/lock-open.svg';
import Eye from '@phosphor-icons/core/assets/regular/eye.svg';
import Info from '@phosphor-icons/core/assets/regular/info.svg';
import Warning from '@phosphor-icons/core/assets/regular/warning.svg';
import CheckCircle from '@phosphor-icons/core/assets/regular/check-circle.svg';
import XCircle from '@phosphor-icons/core/assets/regular/x-circle.svg';
import Broom from '@phosphor-icons/core/assets/regular/broom.svg';
import PaintRoller from '@phosphor-icons/core/assets/regular/paint-roller.svg';
import TShirt from '@phosphor-icons/core/assets/regular/t-shirt.svg';
import Scissors from '@phosphor-icons/core/assets/regular/scissors.svg';
import Door from '@phosphor-icons/core/assets/regular/door.svg';
import ShoppingBag from '@phosphor-icons/core/assets/regular/shopping-bag.svg';
import Hammer from '@phosphor-icons/core/assets/regular/hammer.svg';
import Cube from '@phosphor-icons/core/assets/regular/cube.svg';
import Couch from '@phosphor-icons/core/assets/regular/couch.svg';
import PersonSimpleRun from '@phosphor-icons/core/assets/regular/person-simple-run.svg';
import HandFist from '@phosphor-icons/core/assets/regular/hand-fist.svg';
import HouseFill from '@phosphor-icons/core/assets/fill/house-fill.svg';
import BarbellFill from '@phosphor-icons/core/assets/fill/barbell-fill.svg';
import StorefrontFill from '@phosphor-icons/core/assets/fill/storefront-fill.svg';
import ChartBarFill from '@phosphor-icons/core/assets/fill/chart-bar-fill.svg';
import BooksFill from '@phosphor-icons/core/assets/fill/books-fill.svg';
import HeartFill from '@phosphor-icons/core/assets/fill/heart-fill.svg';
import StarFill from '@phosphor-icons/core/assets/fill/star-fill.svg';
import FireFill from '@phosphor-icons/core/assets/fill/fire-fill.svg';
import LightningFill from '@phosphor-icons/core/assets/fill/lightning-fill.svg';
import TrophyFill from '@phosphor-icons/core/assets/fill/trophy-fill.svg';
import PlayFill from '@phosphor-icons/core/assets/fill/play-fill.svg';
import PauseFill from '@phosphor-icons/core/assets/fill/pause-fill.svg';
import StopFill from '@phosphor-icons/core/assets/fill/stop-fill.svg';
import CheckCircleFill from '@phosphor-icons/core/assets/fill/check-circle-fill.svg';
import XCircleFill from '@phosphor-icons/core/assets/fill/x-circle-fill.svg';
import WarningFill from '@phosphor-icons/core/assets/fill/warning-fill.svg';
import InfoFill from '@phosphor-icons/core/assets/fill/info-fill.svg';
import UserFill from '@phosphor-icons/core/assets/fill/user-fill.svg';
import BellFill from '@phosphor-icons/core/assets/fill/bell-fill.svg';
import LockFill from '@phosphor-icons/core/assets/fill/lock-fill.svg';
import PlusBold from '@phosphor-icons/core/assets/bold/plus-bold.svg';
import MinusBold from '@phosphor-icons/core/assets/bold/minus-bold.svg';
import XBold from '@phosphor-icons/core/assets/bold/x-bold.svg';
import CheckBold from '@phosphor-icons/core/assets/bold/check-bold.svg';
import CaretLeftBold from '@phosphor-icons/core/assets/bold/caret-left-bold.svg';
import CaretRightBold from '@phosphor-icons/core/assets/bold/caret-right-bold.svg';
import CaretDownBold from '@phosphor-icons/core/assets/bold/caret-down-bold.svg';
import CaretUpBold from '@phosphor-icons/core/assets/bold/caret-up-bold.svg';
import DotsThreeBold from '@phosphor-icons/core/assets/bold/dots-three-bold.svg';
import ArrowUpBold from '@phosphor-icons/core/assets/bold/arrow-up-bold.svg';
import ArrowDownBold from '@phosphor-icons/core/assets/bold/arrow-down-bold.svg';
import ArrowRightBold from '@phosphor-icons/core/assets/bold/arrow-right-bold.svg';
import InfinityBold from '@phosphor-icons/core/assets/bold/infinity-bold.svg';
import MagnifyingGlassBold from '@phosphor-icons/core/assets/bold/magnifying-glass-bold.svg';

// keep only what is inside the <svg> element; the wrapper is rendered by <Icon>
const inner = (svg) => svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
const set = (regular, fill, bold) => ({ regular: inner(regular), fill: fill && inner(fill), bold: bold && inner(bold) });

const ICONS = {
  'house': set(House, HouseFill),
  'barbell': set(Barbell, BarbellFill),
  'storefront': set(Storefront, StorefrontFill),
  'chart-bar': set(ChartBar, ChartBarFill),
  'books': set(Books, BooksFill),
  'plus': set(Plus, null, PlusBold),
  'minus': set(Minus, null, MinusBold),
  'x': set(X, null, XBold),
  'check': set(Check, null, CheckBold),
  'caret-left': set(CaretLeft, null, CaretLeftBold),
  'caret-right': set(CaretRight, null, CaretRightBold),
  'caret-down': set(CaretDown, null, CaretDownBold),
  'caret-up': set(CaretUp, null, CaretUpBold),
  'dots-three': set(DotsThree, null, DotsThreeBold),
  'arrow-up': set(ArrowUp, null, ArrowUpBold),
  'arrow-down': set(ArrowDown, null, ArrowDownBold),
  'arrow-right': set(ArrowRight, null, ArrowRightBold),
  'arrow-up-right': set(ArrowUpRight),
  'arrows-down-up': set(ArrowsDownUp),
  'arrows-out': set(ArrowsOut),
  'arrows-out-cardinal': set(ArrowsOutCardinal),
  'arrow-clockwise': set(ArrowClockwise),
  'arrow-counter-clockwise': set(ArrowCounterClockwise),
  'arrows-clockwise': set(ArrowsClockwise),
  'fast-forward': set(FastForward),
  'timer': set(Timer),
  'clock': set(Clock),
  'calendar-blank': set(CalendarBlank),
  'fire': set(Fire, FireFill),
  'trophy': set(Trophy, TrophyFill),
  'medal': set(Medal),
  'lightning': set(Lightning, LightningFill),
  'sparkle': set(Sparkle),
  'star': set(Star, StarFill),
  'trend-up': set(TrendUp),
  'ranking': set(Ranking),
  'users': set(Users),
  'user': set(User, UserFill),
  'user-circle': set(UserCircle),
  'heart': set(Heart, HeartFill),
  'chat-circle': set(ChatCircle),
  'share-network': set(ShareNetwork),
  'export': set(Export),
  'copy': set(Copy),
  'bell': set(Bell, BellFill),
  'gear': set(Gear),
  'palette': set(Palette),
  'sliders-horizontal': set(SlidersHorizontal),
  'flask': set(Flask),
  'coins': set(Coins),
  'infinity': set(Infinity, null, InfinityBold),
  'sun': set(Sun),
  'moon': set(Moon),
  'circle-half': set(CircleHalf),
  'device-mobile': set(DeviceMobile),
  'trash': set(Trash),
  'archive': set(Archive),
  'package': set(Package),
  'pencil-simple': set(PencilSimple),
  'note-pencil': set(NotePencil),
  'play': set(Play, PlayFill),
  'pause': set(Pause, PauseFill),
  'stop': set(Stop, StopFill),
  'magnifying-glass': set(MagnifyingGlass, null, MagnifyingGlassBold),
  'funnel': set(Funnel),
  'list-bullets': set(ListBullets),
  'tag': set(Tag),
  'lock': set(Lock, LockFill),
  'lock-open': set(LockOpen),
  'eye': set(Eye),
  'info': set(Info, InfoFill),
  'warning': set(Warning, WarningFill),
  'check-circle': set(CheckCircle, CheckCircleFill),
  'x-circle': set(XCircle, XCircleFill),
  'broom': set(Broom),
  'paint-roller': set(PaintRoller),
  't-shirt': set(TShirt),
  'scissors': set(Scissors),
  'door': set(Door),
  'shopping-bag': set(ShoppingBag),
  'hammer': set(Hammer),
  'cube': set(Cube),
  'couch': set(Couch),
  'person-simple-run': set(PersonSimpleRun),
  'hand-fist': set(HandFist),
};

export const ICON_NAMES = Object.keys(ICONS);

/** Icon. Props: name (see ICON_NAMES), weight 'regular' | 'fill' | 'bold' (falls back to regular), size in px,
 *  label (omit for decorative icons: they are hidden from assistive tech). */
export function Icon({ name, weight = 'regular', size = 24, label, class: cls, ...rest }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return h('svg', {
    class: cls ? 'gb-icon ' + cls : 'gb-icon',
    width: size, height: size, viewBox: '0 0 256 256', fill: 'currentColor',
    role: label ? 'img' : undefined, 'aria-label': label, 'aria-hidden': label ? undefined : 'true',
    dangerouslySetInnerHTML: { __html: icon[weight] || icon.regular },
    ...rest,
  });
}

const BOLT = ICONS.lightning.fill;

/** The points coin: constant gold with a darker rim, so it reads on every theme and appearance. */
export function PointsGlyph({ size = 18, class: cls }) {
  return h('svg', { class: cls ? 'gb-points-glyph ' + cls : 'gb-points-glyph', width: size, height: size, viewBox: '0 0 256 256', 'aria-hidden': 'true' },
    h('circle', { class: 'gb-points-glyph__coin', cx: 128, cy: 128, r: 114 }),
    h('g', { class: 'gb-points-glyph__bolt', transform: 'translate(52 52) scale(0.594)', dangerouslySetInnerHTML: { __html: BOLT } }),
  );
}
