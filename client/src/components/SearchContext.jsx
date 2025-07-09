import React, { createContext, useContext, useState } from "react";

// Create the context
const SearchContext = createContext();

// Custom hook for easy usage
export const useSearch = () => useContext(SearchContext);

// Provider component
export const SearchProvider = ({ children }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [lastKeywords, setLastKeywords] = useState([]);

  return (
    <SearchContext.Provider value={{ searchResults, setSearchResults, lastKeywords, setLastKeywords }}>
      {children}
    </SearchContext.Provider>
  );
}; 