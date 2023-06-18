async function pagination(page, model, perPage) {
    const total = await model.countDocuments();
    const last = Math.ceil(total / perPage);
    const previous = page - 1;
    const nextPage = page + 1;

    return [last, previous, nextPage];
}

module.exports = pagination;