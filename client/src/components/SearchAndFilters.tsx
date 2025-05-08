import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search } from "lucide-react";

type SearchAndFiltersProps = {
  onSearch?: (query: string) => void;
  onSportFilter?: (sport: string) => void;
  onYearFilter?: (year: string) => void;
  onSort?: (sortBy: string) => void;
  defaultValues?: {
    query?: string;
    sport?: string;
    year?: string;
    sort?: string;
  };
};

const SearchAndFilters = ({
  onSearch,
  onSportFilter,
  onYearFilter,
  onSort,
  defaultValues = {},
}: SearchAndFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState(defaultValues.query || "");
  const [location, setLocation] = useLocation();
  
  // Handle search query changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  // Handle sport filter changes
  const handleSportChange = (value: string) => {
    if (onSportFilter) {
      onSportFilter(value);
    }
  };

  // Handle year filter changes
  const handleYearChange = (value: string) => {
    if (onYearFilter) {
      onYearFilter(value);
    }
  };

  // Handle sort changes
  const handleSortChange = (value: string) => {
    if (onSort) {
      onSort(value);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search cards by player, team, year..."
                className="w-full pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </div>
            </div>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select 
            defaultValue={defaultValues.sport || "all"} 
            onValueChange={handleSportChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="basketball">Basketball</SelectItem>
              <SelectItem value="baseball">Baseball</SelectItem>
              <SelectItem value="football">Football</SelectItem>
              <SelectItem value="hockey">Hockey</SelectItem>
              <SelectItem value="soccer">Soccer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            defaultValue={defaultValues.year || "all"} 
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2020+">2020+</SelectItem>
              <SelectItem value="2010-2019">2010-2019</SelectItem>
              <SelectItem value="2000-2009">2000-2009</SelectItem>
              <SelectItem value="1990-1999">1990-1999</SelectItem>
              <SelectItem value="before1990">Before 1990</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            defaultValue={defaultValues.sort || "recent"} 
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By: Recent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Sort By: Recent</SelectItem>
              <SelectItem value="value-high-to-low">Value: High to Low</SelectItem>
              <SelectItem value="value-low-to-high">Value: Low to High</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilters;
