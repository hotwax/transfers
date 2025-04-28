/* eslint-disable */
const prepareOrderQuery = (query: any) => {
  const viewSize = query.viewSize || query.viewSize === 0 ? query.viewSize : process.env.VUE_APP_VIEW_SIZE;  
  const viewIndex = query.viewIndex ? query.viewIndex : 0;

  const payload = {
    "json": {
      "params": {
        "sort": `${query.sort}`,
        "rows": viewSize,
        "start": viewSize * viewIndex,
        "group": true,
        "group.field": `${query.groupBy}`,
        "group.limit": 10000,
        "group.ngroups": true,
        "q.op": "AND"
      } as any,
      "query": "*:*",
      "filter": ["docType: ORDER", "orderTypeId: TRANSFER_ORDER"]
    }
  } as any

  if(query.fetchFacets) {
    payload.json["facet"] = {
      "productStoreIdFacet":{
        "excludeTags":"orderFilter",
        "field":"productStoreName",
        "mincount":1,
        "limit":-1,
        "type":"terms",
        "facet":{
          "groups":"unique(orderId)"
        }
      },
      "facilityNameFacet":{
        "excludeTags":"orderFilter",
        "field":"facilityName",
        "mincount":1,
        "limit":-1,
        "type":"terms",
        "facet":{
          "groups":"unique(orderId)"
        }
      },
      "orderFacilityNameFacet":{
        "excludeTags":"orderFilter",
        "field":"orderFacilityName",
        "mincount":1,
        "limit":-1,
        "type":"terms",
        "facet":{
          "groups":"unique(orderId)"
        }
      },
      "carrierPartyIdFacet": {
        "excludeTags": "orderFilter",
        "field": "carrierPartyId",
        "mincount": 1,
        "limit": -1,
        "type": "terms",
        "facet": {
          "groups": "unique(orderId)"
        }
      },
      "shipmentMethodTypeIdFacet": {
        "excludeTags": "orderFilter",
        "field": "shipmentMethodTypeId",
        "mincount": 1,
        "limit": -1,
        "type": "terms",
        "facet": {
          "groups": "unique(orderId)"
        }
      },
      "orderStatusDescFacet": {
        "excludeTags": "orderFilter",
        "field": "orderStatusDesc",
        "mincount": 1,
        "limit": -1,
        "sort": {
          "statusSeqId": "asc"
        },
        "type": "terms",
        "facet": {
          "groups": "unique(orderId)",
          "statusSeqId": "max(statusSeqId)"
        }
      },
    }
  }

  if(query.fetchFacets) {
    return payload;
  }

  if (query.queryString) {
    payload.json.params.defType = "edismax"
    payload.json.params.qf = "orderName orderId customerPartyName productId internalName parentProductName"
    payload.json.query = `*${query.queryString}*`
  }

  if (query.productStore) {
    payload.json.filter.push(`{!tag=orderFilter}productStoreName: \"${query.productStore}\"`)
  }

  if (query.originFacility) {
    payload.json.filter.push(`{!tag=orderFilter}facilityName: \"${query.originFacility}\"`)
  }

  if (query.destinationFacility) {
    payload.json.filter.push(`{!tag=orderFilter}orderFacilityName: \"${query.destinationFacility}\"`)
  }

  if (query.shipmentMethodTypeId) {
    payload.json.filter.push(`{!tag=orderFilter}shipmentMethodTypeId: ${query.shipmentMethodTypeId}`)
  }

  if (query.carrierPartyId) {
    payload.json.filter.push(`{!tag=orderFilter}carrierPartyId: ${query.carrierPartyId}`)
  }

  if (query.status?.length) {
    payload.json.filter.push(`{!tag=orderFilter}orderStatusDesc: \"${query.status}\"`)
  }

  return payload
}

export { prepareOrderQuery }
