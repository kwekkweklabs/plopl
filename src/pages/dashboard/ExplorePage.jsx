import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Input, Button } from '@heroui/react';
import { useNavigate } from 'react-router';

export default function ExplorePage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3710/schema/explore');
        setRecipes(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  // Filter recipes based on search query
  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Copy ID to clipboard
  const copyToClipboard = (id) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-orange-600">
              Explore Recipes
            </span>
          </h2>
          <p className="text-gray-600 mt-1">Discover and use verification recipes created by the community</p>
        </div>
        
        <div className="w-full md:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-150"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Loading recipes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 flex items-center">
          <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      ) : (
        <div>
          {filteredRecipes.length === 0 ? (
            <div className="bg-gray-50 p-16 rounded-xl text-center">
              <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-600 mt-4">No recipes found matching your search</h3>
              <p className="text-gray-500 mt-2">Try adjusting your search terms or create a new recipe</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <div 
                  key={recipe.id}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-orange-200 flex flex-col"
                >
                  <div className="h-3 bg-gradient-to-r from-orange-400 to-orange-600"></div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-2">
                      <h3 className="text-xl font-bold text-blue-700 group-hover:text-blue-800 transition-colors">
                        {recipe.name}
                      </h3>
                      <div className="mt-1.5 flex items-center">
                        <div className="flex bg-gray-100 rounded-md overflow-hidden">
                          <div className="px-2 py-1 text-xs font-mono text-gray-600 truncate max-w-[180px]" title={recipe.id}>
                            {recipe.id}
                          </div>
                          <button 
                            onClick={() => copyToClipboard(recipe.id)}
                            className="bg-gray-200 hover:bg-gray-300 transition-colors px-2 py-1 flex items-center"
                            title="Copy ID to clipboard"
                          >
                            {copiedId === recipe.id ? (
                              <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mt-2 mb-4 flex-1">
                      {recipe.description.length > 120 
                        ? `${recipe.description.slice(0, 120)}...` 
                        : recipe.description}
                    </p>
                    
                    <div className="mt-auto flex justify-between items-center">
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="h-4 w-4 mr-1 text-orange-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verification Recipe
                      </div>
                      
                      <Button 
                        onClick={() => navigate(`/dashboard/recipe/${recipe.id}`)}
                      className="bg-orange-500 hover:bg-orange-600 text-white transition-colors px-4 py-2 rounded-lg">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
