// Use fetch to dynamically load the macro-classes.json file
async function loadMacroClasses() {
    const response = await fetch('./macro-classes.json');
    if (!response.ok) {
      throw new Error(`Failed to load macro-classes.json`);
    }
    return await response.json();
  }
  
  const allEntriesLabel = "<tous>";
  
  class Feature {
    constructor(obj) {
      Object.assign(this, obj);
      this.properties.PEOPLE.forEach(person => person.feature = this);
    }
  
    getPeople() {
      return this.properties.PEOPLE;
    }
  
    getJobs() {
      const jobs = new Set();
      for (const person of this.getPeople()) {
        jobs.add(person.job);
      }
      return jobs;
    }
  
    getAddress() {
      return this.properties.RUE_OFF;
    }
  
    getFullAddress() {
      return this.properties.RUE_OFF + " " + this.properties.TEXTSTRING;
    }
  
    getNb() {
      return this.properties.TEXTSTRING;
    }
  
    getLeafletCoord() {
      return L.latLng([this.geometry.coordinates[1], this.geometry.coordinates[0]]);
    }
  
    getId() {
      return this.properties.RUE_ABR.replace(/[^\w]/g, '') + this.properties.TEXTSTRING.replace(/[^\w]/g, '');
    }
  }
  
  class Directory {
    constructor(directory, features, people, macroClasses) {
      if (features === undefined) return this.construct_from_geojson(directory, macroClasses); // overloaded constructor
      this.features = features;
      this.geojson_headers = directory.geojson_headers;
      this.jobs = directory.jobs;
      this.people = people;
      this.addresses = directory.addresses;
    }
  
    async construct_from_geojson(geojson, macroClasses) {
      const comparator = new Intl.Collator("fr", { sensitivity: "base" });
      this.features = geojson.features.map(feature => {
        feature = new Feature(feature);
        feature.getPeople().sort(comparator.compare);
        return feature;
      }).sort((a, b) => {
        const res = comparator.compare(a.getAddress(), b.getAddress());
        if (res) return res;
        const pattern = /(\d*)(.*)/;
        const [, num1, str1] = a.getNb().match(pattern);
        const [, num2, str2] = b.getNb().match(pattern);
        return num1 - num2 || comparator.compare(str1, str2);
      });
  
      this.geojson_headers = geojson;
      this.people = this.features.reduce((acc, cur) => acc.concat(cur.getPeople()), []);
      this.jobs = this.generateJobsArray().sort(comparator.compare);
      this.jobCategories = Object.keys(macroClasses).sort(comparator.compare);
      this.addresses = this.generateAddressesArray().sort(comparator.compare);
      Object.values(macroClasses).forEach((category) => category.sort(comparator.compare));
    }
  
    generateAddressesArray() {
      const addresses = new Set();
      for (const feature of this.features) {
        addresses.add(feature.getAddress());
      }
      return Array.from(addresses);
    }
  
    generateJobsArray() {
      const jobs = new Set();
      for (const person of this.people) {
        jobs.add(person.job);
      }
      return Array.from(jobs);
    }
  
    getJobsOfCategory(category, macroClasses) {
      if (category === allEntriesLabel) return this.jobs;
      return macroClasses[category].filter((job) => this.jobs.includes(job));
    }
  
    filterByJob(job) {
      if (job === allEntriesLabel) return this;
      const filtered_features = new Set();
      const filtered_people = [];
      for (const person of this.people) {
        if (person.job === job) {
          filtered_features.add(person.feature);
          filtered_people.push(person);
        }
      }
      return new Directory(this, Array.from(filtered_features), filtered_people);
    }
  
    filterByJobCategory(category, macroClasses) {
      if (category === allEntriesLabel) return this;
      const filtered_features = new Set();
      const filtered_people = [];
      category = this.getJobsOfCategory(category, macroClasses);
  
      for (const person of this.people) {
        if (category.includes(person.job)) {
          filtered_features.add(person.feature);
          filtered_people.push(person);
        }
      }
      return new Directory(this, Array.from(filtered_features), filtered_people);
    }
  
    filterByAddress(address) {
      if (address === allEntriesLabel) return this;
      const filtered_features = this.features.filter(feature => feature.getAddress() === address);
      const filtered_people = this.people.filter(person => person.feature.getAddress() === address);
      return new Directory(this, filtered_features, filtered_people);
    }
  
    get geojson() {
      const geojson = Object.assign({}, this.geojson_headers);
      geojson.features = this.features;
      return geojson;
    }
  }
  
  export default async function initializeDirectory(directory) {
    try {
      const macroClasses = await loadMacroClasses();
      const dirInstance = new Directory(directory, undefined, undefined, macroClasses);
      return dirInstance;
    } catch (error) {
      console.error('Error initializing Directory:', error);
    }
  }
  