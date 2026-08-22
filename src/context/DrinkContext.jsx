import React, { createContext, useState, useContext, useEffect } from 'react';
import { Wine, Beer, Martini, GlassWater, Citrus, Zap, CupSoda, Flame, Grape, Droplets, Coffee } from 'lucide-react';
import { assetUrl } from '../utils/assets';

export const initialDrinks = [
  { id: 'soju', name: '소주', imagePath: assetUrl('assets/drinks/soju.png'), color: '#4ade80' },
  { id: 'beer', name: '맥주', imagePath: assetUrl('assets/drinks/beer.png'), color: '#facc15' },
  { id: 'wine', name: '와인', imagePath: assetUrl('assets/drinks/wine.png'), color: '#f43f5e' },
  { id: 'whiskey', name: '위스키', imagePath: assetUrl('assets/drinks/whiskey.png'), color: '#fb923c' },
  { id: 'makgeolli', name: '막걸리', imagePath: assetUrl('assets/drinks/makgeolli.png'), color: '#fef08a' },
  { id: 'highball', name: '하이볼', imagePath: assetUrl('assets/drinks/highball.png'), color: '#fbbf24' }
];

export const mixCombinations = {
  'beer_soju': { id: 'somaek', name: '소맥', imagePath: assetUrl('assets/drinks/somaek.png'), color: '#60a5fa' },
  'beer_whiskey': { id: 'bomb', name: '폭탄주', imagePath: assetUrl('assets/drinks/bomb.png'), color: '#ef4444' },
  'carbonated_whiskey': { id: 'highball', name: '하이볼', imagePath: assetUrl('assets/drinks/highball.png'), color: '#fbbf24' },
  'carbonated_wine': { id: 'wine_spritzer', name: '와인 스프리처', imagePath: assetUrl('assets/drinks/wine.png'), color: '#ec4899' },
  'beer_wine': { id: 'beer_sangria', name: '비어 상그리아', imagePath: assetUrl('assets/drinks/wine.png'), color: '#f43f5e' },
  'cola_whiskey': { id: 'jackcoke', name: '잭콕', imagePath: assetUrl('assets/drinks/jackcoke.png'), color: '#78350f' },
  'cola_soju': { id: 'socola', name: '소콜', imagePath: assetUrl('assets/drinks/cola.png'), color: '#991b1b' },
  'soju_sprite': { id: 'sosa', name: '소사', imagePath: assetUrl('assets/drinks/sprite.png'), color: '#a7f3d0' },
  'sprite_wine': { id: 'wine_ade', name: '와인에이드', imagePath: assetUrl('assets/drinks/wine.png'), color: '#fbcfe8' },
  'cola_sprite': { id: 'ssacol', name: '황금비율 싸콜?', imagePath: assetUrl('assets/drinks/ssacol.png'), color: '#047857' },
  'makgeolli_sprite': { id: 'maksa', name: '막사', imagePath: assetUrl('assets/drinks/maksa.png'), color: '#f8fafc' },
  'beer_cola': { id: 'diesel', name: '디젤', imagePath: assetUrl('assets/drinks/diesel.png'), color: '#451a03' },
  'cola_somaek': { id: 'gojin', name: '고진감래', imagePath: assetUrl('assets/drinks/gojin.png'), color: '#9a3412' },
  'diesel_soju': { id: 'gojin', name: '고진감래', imagePath: assetUrl('assets/drinks/gojin.png'), color: '#9a3412' }
};

export const nonAlcoholicItems = [
  { id: 'carbonated', name: '탄산수', imagePath: assetUrl('assets/drinks/carbonated.png'), color: '#38bdf8' },
  { id: 'cola', name: '콜라', imagePath: assetUrl('assets/drinks/cola.png'), color: '#ef4444' },
  { id: 'sprite', name: '사이다', imagePath: assetUrl('assets/drinks/sprite.png'), color: '#22c55e' },
  { id: 'water', name: '물', imagePath: assetUrl('assets/drinks/water.png'), color: '#93c5fd' }
];

const DrinkContext = createContext();

export function DrinkProvider({ children }) {
  const [drinks, setDrinks] = useState(initialDrinks);
  const [favorites, setFavorites] = useState([]);

  // Load favorites from local storage on mount
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('omaju_favorites') || '[]');
    setFavorites(savedFavorites);

    // Reconstruct drink objects for saved favorites
    const loadedDrinks = [...initialDrinks];
    
    // Combine all possible custom items
    const allCustomItems = [
      ...Object.values(mixCombinations),
      ...nonAlcoholicItems
    ];

    savedFavorites.forEach(favId => {
      const foundItem = allCustomItems.find(item => item.id === favId);
      if (foundItem && !loadedDrinks.find(d => d.id === favId)) {
        loadedDrinks.push(foundItem);
      }
    });

    setDrinks(loadedDrinks);
  }, []);

  const addDrink = (newDrink) => {
    if (!drinks.find(d => d.id === newDrink.id)) {
      setDrinks(prev => [...prev, newDrink]);
    }
  };

  const removeDrink = (drinkId) => {
    // 기본 주종은 삭제 불가
    if (initialDrinks.some(d => d.id === drinkId)) return;
    setDrinks(prev => prev.filter(d => d.id !== drinkId));
    // 찜 목록에서도 제거
    setFavorites(prev => {
      const newFavorites = prev.filter(id => id !== drinkId);
      localStorage.setItem('omaju_favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const toggleFavorite = (drinkId) => {
    setFavorites(prev => {
      let newFavorites;
      if (prev.includes(drinkId)) {
        newFavorites = prev.filter(id => id !== drinkId);
      } else {
        newFavorites = [...prev, drinkId];
      }
      localStorage.setItem('omaju_favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const isFavorite = (drinkId) => favorites.includes(drinkId);

  // Check if a drink is a default (initial) drink
  const isDefaultDrink = (drinkId) => initialDrinks.some(d => d.id === drinkId);

  const getFavoriteDrinks = () => {
    const catalog = [
      ...initialDrinks,
      ...Object.values(mixCombinations),
      ...nonAlcoholicItems,
      ...drinks,
    ];
    const byId = new Map();
    catalog.forEach((d) => {
      if (d?.id && !byId.has(d.id)) byId.set(d.id, d);
    });
    return favorites.map((id) => byId.get(id)).filter(Boolean);
  };

  return (
    <DrinkContext.Provider
      value={{
        drinks,
        favorites,
        addDrink,
        removeDrink,
        toggleFavorite,
        isFavorite,
        isDefaultDrink,
        getFavoriteDrinks,
      }}
    >
      {children}
    </DrinkContext.Provider>
  );
}

export function useDrinkContext() {
  return useContext(DrinkContext);
}
