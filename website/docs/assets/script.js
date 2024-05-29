import geojson_1923 from './directory1923.geojson' with { type: 'json' };
import geojson_1951 from './directory1951.geojson' with { type: 'json' };
import Map from "./map.js"
import Directory from './addresses.js';

const directory_1923 = new Directory(geojson_1923)
const directory_1951 = new Directory(geojson_1951)
const allEntriesLabel="<tous>"

const data_year = {
  Y1923: "1923",
  Y1951: "1951"
}
const data_year_radiobutton = {
  Y1923: document.querySelector("input[name='date_selection'][value=old]"),
  Y1951: document.querySelector("input[name='date_selection'][value=new]")
}

const layers = {
  TOPOGRAPHIC: "TOPOGRAPHIC",
  CITYMAP: "CITYMAP",
  BOTH: "BOTH"
}

const layers_radiobutton = {
  TOPOGRAPHIC: document.querySelector("input[name='layers_selection'][value=TOPOGRAPHIC]"),
  CITYMAP: document.querySelector("input[name='layers_selection'][value=CITYMAP]"),
  BOTH: document.querySelector("input[name='layers_selection'][value=BOTH]")
}

const heatlayer_checkbox = document.getElementById("heatlayer_checkbox")

const jobCategoryDropdown = document.getElementById("jobCategoryDropdown")
const jobsDropdown = document.getElementById("jobsDropdown")
const addressDropdown = document.getElementById("addressDropdown")

class App {
  map = new Map()
  backgroundLayers = {}
  directory
  addressFilteredDirectory
  jobsFilteredDirectory


  constructor() {
    this.year = data_year.Y1923
    this.displayed_layers = layers.CITYMAP
    globalThis.setConfig = this.setConfig.bind(this)
  }

  #year
  get year() {
    return this.#year
  }
  set year(y) {
    if(y===this.#year) return
    this.#year = y
    data_year_radiobutton['Y'+y].checked = true;
    switch(this.year) {
      case data_year.Y1923:
        this.backgroundLayers[layers.TOPOGRAPHIC] = [this.map.layers[1926]]
        this.backgroundLayers[layers.CITYMAP] = [this.map.layers[1937]]
        this.backgroundLayers[layers.BOTH] = [this.map.layers[1926], this.map.layers.transparent_1937]
        this.directory = directory_1923
        data_year_radiobutton.Y1923.checked=true
        break
      case data_year.Y1951:
        this.backgroundLayers[layers.TOPOGRAPHIC] = [this.map.layers[1954]]
        this.backgroundLayers[layers.CITYMAP] = [this.map.layers[1937]]
        this.backgroundLayers[layers.BOTH] = [this.map.layers[1954], this.map.layers.transparent_1937]
        this.directory = directory_1951
        data_year_radiobutton.Y1951.checked=true
        break
    }
    if (populateDropdown(jobCategoryDropdown, this.directory.jobCategories)) this.#jobCategoryFilter = jobCategoryDropdown.value;
    if (populateDropdown(jobsDropdown, this.directory.getJobsOfCategory(this.#jobCategoryFilter))) this.#jobsFilter=jobsDropdown.value;
    if (populateDropdown(addressDropdown, this.directory.addresses)) this.#addressFilter = addressDropdown.value;
    if([layers.TOPOGRAPHIC, layers.BOTH].includes(this.#displayed_layers)) this.map.setBackgroundLayers(this.backgroundLayers[this.#displayed_layers])
    this.updateJsonLayer()
  }
  #displayed_layers
  set displayed_layers(label) {
    layers_radiobutton[label].checked = true
    if(label !== this.#displayed_layers) this.map.setBackgroundLayers(this.backgroundLayers[label])
    this.#displayed_layers = label
  }

  set displayHeatmap(display) {
    heatlayer_checkbox.checked=display
    this.map.displayHeatLayer(display)
  }

  #addressFilter = allEntriesLabel
  set addressFilter(filter) {
    if(filter===this.#addressFilter) return
    this.#addressFilter=filter
    addressDropdown.value=filter
    this.updateJsonLayer()
  }

  #jobCategoryFilter = allEntriesLabel
  set jobCategoryFilter(filter) {
    if(filter===this.#jobCategoryFilter) return
    this.#jobCategoryFilter = filter
    jobCategoryDropdown.value=filter
    if (populateDropdown(jobsDropdown, this.directory.getJobsOfCategory(this.#jobCategoryFilter))) this.#jobsFilter=jobsDropdown.value;
    this.jobCategoryFilteredDirectory = this.addressFilteredDirectory.filterByJobCategory(filter)
    this.jobsFilteredDirectory = this.jobCategoryFilteredDirectory.filterByJob(this.#jobsFilter)
    this.map.setJsonLayer(this.jobsFilteredDirectory.geojson, this.jobsFilteredDirectory.people)
  }


  #jobsFilter = allEntriesLabel
  set jobsFilter(filter) {
    if(filter===this.#jobsFilter) return
    this.#jobsFilter = filter
    jobsDropdown.value=filter
    this.jobsFilteredDirectory = this.jobCategoryFilteredDirectory.filterByJob(filter)
    this.map.setJsonLayer(this.jobsFilteredDirectory.geojson, this.jobsFilteredDirectory.people)
  }

  updateJsonLayer() {
    this.addressFilteredDirectory = this.directory.filterByAddress(this.#addressFilter)
    this.jobCategoryFilteredDirectory = this.addressFilteredDirectory.filterByJobCategory(this.#jobCategoryFilter)
    this.jobsFilteredDirectory = this.jobCategoryFilteredDirectory.filterByJob(this.#jobsFilter)
    this.map.setJsonLayer(this.jobsFilteredDirectory.geojson, this.jobsFilteredDirectory.people)
  }

  setConfig(config) {
    config = {
      year: data_year.Y1923,
      displayHeatmap: true,
      addressFilter: allEntriesLabel,
      jobCategoryFilter: allEntriesLabel,
      jobsFilter: allEntriesLabel,
      displayed_layers: layers.CITYMAP,
      ...config
    }
    Object.keys(config).forEach((key) => {
      this[key] = config[key];
    })
    this.map.map.setView(this.map.center, 23)

    document.getElementById('map_section').scrollIntoView({ behavior: 'smooth' });
  }

}

const app = new App()

data_year_radiobutton.Y1923.addEventListener('change', function() {
  app.year=data_year.Y1923
})
data_year_radiobutton.Y1951.addEventListener('change', function() {
  app.year=data_year.Y1951
})
layers_radiobutton.TOPOGRAPHIC.addEventListener('change', function() {
  app.displayed_layers=layers.TOPOGRAPHIC
})
layers_radiobutton.CITYMAP.addEventListener('change', function() {
  app.displayed_layers=layers.CITYMAP
})
layers_radiobutton.BOTH.addEventListener('change', function() {
  app.displayed_layers=layers.BOTH
})
heatlayer_checkbox.addEventListener('change', function() {
  app.displayHeatmap=heatlayer_checkbox.checked
})
jobCategoryDropdown.addEventListener("change", function (event) {
  app.jobCategoryFilter = event.target.value
});
jobsDropdown.addEventListener("change", function (event) {
  app.jobsFilter = event.target.value
});
addressDropdown.addEventListener("change", function (event) {
  app.addressFilter = event.target.value
});

function populateDropdown(dropdown, values) {
  values = [allEntriesLabel, ...values]
  const oldvalue = dropdown.options.length? dropdown.value : null
  dropdown.innerHTML=""
  values.forEach(value => {
    const option = document.createElement("option");
    option.text = value;
    option.value = value;
    dropdown.add(option);
  });
  if(oldvalue!==null && values.includes(oldvalue)) {
    dropdown.value = oldvalue
    return false
  }
  else return true
}


