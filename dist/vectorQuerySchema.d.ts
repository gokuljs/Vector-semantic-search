export declare const vectorQuerySchema: (query: number[]) => ({
    $vectorSearch: {
        index: string;
        path: string;
        queryVector: number[];
        numCandidates: number;
        limit: number;
    };
    $project?: undefined;
} | {
    $project: {
        _id: number;
        image_url: number;
        description: number;
        score: {
            $meta: string;
        };
    };
    $vectorSearch?: undefined;
})[];
