'use client'

import _, { get } from 'lodash';
import { useState } from 'react';


export type IParams = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    page?: string | number;
    sort?: string;
    limit?: string;
};

const searchKey = 'search';

const useFilter =() => {
    const [query, setQuery] = useState<IParams>({});

    const reset = () => {
        setQuery({});
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQuery = (key: string, value: any) => {
        const validateParams = _.omitBy({ ...query, [key]: value }, (value) =>
            value === undefined || value === '' || value === null || value === 'all' || (Array.isArray(value) && value.length === 0)
        );
       setQuery(validateParams)
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQueries = (params: { key: string; value: any }[]) => {
        const newQuery = { ...query };
        params.forEach(({ key, value }) => {
            newQuery[key] = value;
        });
        const validateParams = _.omitBy(newQuery, (value) =>
            value === undefined || value === '' || value === null || value === 'all' || (Array.isArray(value) && value.length === 0)
        );
        setQuery(validateParams);
    };
    const applyFilter = <T extends object>(data: T[]) => {
        return data.filter(item => {
            return Object.entries(query).every(([key, value]) => {
                const isSearchKey = key.includes(searchKey);

                // If filter value is an array -> treat as multiple acceptable tokens
                if (Array.isArray(value)) {
                    if (isSearchKey) {
                        const searchFields = key.split(',').slice(1);
                        return searchFields.some(field =>
                            value.some(v =>
                                String(get(item, field) ?? '')
                                    .toLowerCase()
                                    .includes(String(v).toLowerCase())
                            )
                        );
                    }

                    const fieldVal = get(item, key);
                    // if the item's field is an array, check intersection
                    if (Array.isArray(fieldVal)) {
                        return value.some(v => fieldVal.includes(v));
                    }
                    // otherwise check if any token matches (partial match)
                    return value.some(v =>
                        String(fieldVal ?? '')
                            .toLowerCase()
                            .includes(String(v).toLowerCase())
                    );
                }

                if (isSearchKey) {
                    const searchFields = key.split(',').slice(1);
                    return searchFields.some(field =>
                        String(get(item, field) ?? '')
                            .toLowerCase()
                            .includes(String(value).toLowerCase())
                    );
                }

                return String(get(item, key) ?? '')
                    .toLowerCase()
                    .includes(String(value).toLowerCase());
            });
        });
    };

    return { query, updateQuery, updateQueries, reset, applyFilter };
};

export default useFilter;
