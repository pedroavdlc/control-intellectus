export interface LocationPoint {
    id: string;
    lat: number;
    lng: number;
    address: string;
    date: string;
    phone: string;
    timestamp: number;
}

export interface DeviceRecord {
    phone: string;
    locations: LocationPoint[];
}

export interface MapMarker {
    id: string;
    lat: number;
    lng: number;
    label: string;
    phone?: string;
    radius?: number;
    type?: 'device' | 'antenna';
    antennaSector?: any;
}
