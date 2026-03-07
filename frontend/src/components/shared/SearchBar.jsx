import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Input from '../ui/Input';

const SearchBar = ({ onSearch, placeholder = 'Search...', className = '', delay = 300 }) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchTerm);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, onSearch, delay]);

  return (
    <Input
      icon={Search}
      placeholder={placeholder}
      className={className}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      aria-label="Search"
    />
  );
};

export default SearchBar;
