// Transit-tracker app-feature provider wiring.
//
// This app renders every surface (arrivals board, stop lists, route map,
// itineraries) directly via React + ClassMap, so no feature contracts
// (dataTable, dateRangePicker, virtualScroll, commandPalette) need wiring.
// Keep this file as the bond-discovery hook point for adding providers
// later — concrete providers get bonded here when a page requires them.
export {}
