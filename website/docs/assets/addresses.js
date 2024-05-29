import macro_classes from './macro-classes.json' with { type: 'json' };
const allEntriesLabel="<tous>"

class Feature {
    constructor(obj) {
        Object.assign(this, obj)
        this.properties.PEOPLE.forEach(person => person.feature=this)
    }

    getPeople() {
        return this.properties.PEOPLE
    }

    getJobs() {
        jobs = new Set()
        for(const person of this.getPeople()) {
            jobs.add(person.job)
        }
        return jobs
    }

    getAddress() {
        return this.properties.RUE_OFF
    }

    getFullAddress() {
        return this.properties.RUE_OFF + " " + this.properties.TEXTSTRING
    }

    getNb() {
        return this.properties.TEXTSTRING
    }

    getLeafletCoord() {
        return L.latLng([this.geometry.coordinates[1], this.geometry.coordinates[0]])
    }

    getId() {
        return this.properties.RUE_ABR.replace(/[^\w]/g, '') + this.properties.TEXTSTRING.replace(/[^\w]/g, '')
    }

}

class Directory {
    construct_from_geojson(geojson) {
        const comparator = new Intl.Collator("fr", {sensitivity: "base"})
        this.features = geojson.features.map(feature => {
            feature = new Feature(feature)
            feature.getPeople().sort(comparator.compare)
            return feature
            }).sort((a,b) => {
            const res = comparator.compare(a.getAddress(), b.getAddress())
            if (res) return res
            const pattern = /(\d*)(.*)/
            const [, num1,str1] = a.getNb().match(pattern)
            const [, num2,str2] = b.getNb().match(pattern)
            // str comparison if num1 and num2 equals or NaN
            return num1-num2 || comparator.compare(str1, str2)
        })
        this.geojson_headers = geojson
        //this.geojson_headers.features=undefined
        this.people = this.features.reduce((acc, cur) => acc.concat(cur.getPeople()), [])
        this.jobs = this.generateJobsArray().sort(comparator.compare)
        this.jobCategories=Object.keys(macro_classes).sort(comparator.compare)
        this.addresses = this.generateAddressesArray().sort(comparator.compare)
        Object.values(macro_classes).forEach((category) => category.sort(comparator.compare))
    }

    constructor(directory, features, people) {
        if(features === undefined) return this.construct_from_geojson(directory) //overloaded constructor
        this.features = features
        this.geojson_headers = directory.geojson_headers
        this.jobs = directory.jobs
        this.people = people
        this.addresses=directory.addresses
    }

    generateAddressesArray() {
        const addresses = new Set()
        for(const feature of this.features) {
            addresses.add(feature.getAddress())
        }
        return Array.from(addresses)
    }

    generateJobsArray() {
        const jobs = new Set()
        for(const person of this.people) {
            jobs.add(person.job)
        }
        return Array.from(jobs)
    }

    getJobsOfCategory(category) {
        if(category===allEntriesLabel) return this.jobs
        return macro_classes[category].filter((job) => this.jobs.includes(job))
    }

    filterByJob(job) {
        if(job===allEntriesLabel) return this
        const filtered_features = new Set()
        const filtered_people = []
        for(const person of this.people) {
            if (person.job === job) {
                filtered_features.add(person.feature)
                filtered_people.push(person)
            }
        }
        return new Directory(this, Array.from(filtered_features), filtered_people)
    }

    filterByJobCategory(category) {
        if(category===allEntriesLabel) return this
        const filtered_features = new Set()
        const filtered_people = []
        category = this.getJobsOfCategory(category)

        for(const person of this.people) {
            if (category.includes(person.job)) {
                filtered_features.add(person.feature)
                filtered_people.push(person)
            }
        }
        return new Directory(this, Array.from(filtered_features), filtered_people)
    }

    filterByAddress(address) {
        if(address===allEntriesLabel) return this
        const filtered_features = this.features.filter(feature => feature.getAddress() === address)
        const filtered_people = this.people.filter(person => person.feature.getAddress() === address)
        return new Directory(this, filtered_features, filtered_people)
    }

    get geojson() {
        const geojson = Object.assign({}, this.geojson_headers)
        geojson.features = this.features
        return geojson
    }
}

export default Directory