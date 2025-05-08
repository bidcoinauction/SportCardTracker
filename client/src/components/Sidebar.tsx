import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  PlusCircle, 
  CreditCard, 
  TrendingUp,
  Volleyball,
  Trophy,
  Beaker,
  CableCar,
  Goal,
  X,
  LogOut
} from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [location] = useLocation();

  const isActiveRoute = (route: string) => {
    return location === route;
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => (
    <li className="mb-2">
      <Link href={to}>
        <a
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md",
            isActiveRoute(to)
              ? "bg-primary bg-opacity-10 text-primary"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          <Icon className="mr-3 h-5 w-5" />
          {label}
        </a>
      </Link>
    </li>
  );

  const sidebarClasses = cn(
    "md:w-64 md:min-h-screen bg-white shadow-sm flex flex-col",
    isOpen 
      ? "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out" 
      : "hidden md:block"
  );

  return (
    <div className={sidebarClasses}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-md mr-2 bg-primary text-white flex items-center justify-center">
            🏆
          </div>
          <h1 className="text-xl font-bold text-gray-800">SportCard Vault</h1>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4">
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
            Main Menu
          </p>
          <ul>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/collection" icon={CreditCard} label="My Collection" />
            <NavItem to="/add-card" icon={PlusCircle} label="Add New Card" />
            <NavItem to="/value-tracker" icon={TrendingUp} label="Value Tracker" />
          </ul>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
            Categories
          </p>
          <ul>
            <NavItem to="/collection?sport=basketball" icon={Volleyball} label="Volleyball" />
            <NavItem to="/collection?sport=football" icon={Trophy} label="Trophy" />
            <NavItem to="/collection?sport=baseball" icon={Beaker} label="Beaker" />
            <NavItem to="/collection?sport=hockey" icon={CableCar} label="Hockey" />
            <NavItem to="/collection?sport=soccer" icon={Goal} label="Soccer" />
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
            JS
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">John Smith</p>
            <Link href="/logout">
              <a className="text-xs text-gray-500 flex items-center">
                <LogOut className="h-3 w-3 mr-1" />
                Logout
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
