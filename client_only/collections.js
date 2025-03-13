// JavaScript implementation of Python's OrderedDict
class OrderedDict {
    constructor() {
      this._map = new Map();
    }
  
    // Set a key-value pair
    set(key, value) {
      this._map.set(key, value);
      return this;
    }
  
    // Get a value by key
    get(key) {
      return this._map.get(key);
    }
  
    // Check if a key exists
    has(key) {
      return this._map.has(key);
    }
  
    // Delete a key
    delete(key) {
      return this._map.delete(key);
    }
  
    // Clear all entries
    clear() {
      this._map.clear();
    }
  
    // Get number of entries
    get size() {
      return this._map.size;
    }
  
    // Get all keys
    keys() {
      return this._map.keys();
    }
  
    // Get all values
    values() {
      return this._map.values();
    }
  
    // Get all entries
    entries() {
      return this._map.entries();
    }
  
    // Iterator protocol
    [Symbol.iterator]() {
      return this._map[Symbol.iterator]();
    }
  
    // Allow bracket notation
    get(key) {
      return this._map.get(key);
    }
  
    set(key, value) {
      this._map.set(key, value);
      return this;
    }
  }
  
  module.exports = {
    OrderedDict
  };