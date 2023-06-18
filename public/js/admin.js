function deleteProduct(btn) {
    const prodId = btn.parentNode.querySelector('[name="productId"').value;
    const csrf = btn.parentNode.querySelector('[name="_csrf"').value;
    const parentElement = btn.closest('article');

    console.log({
        prodId,
        csrf,
        parentElement
    });

    fetch('/admin/delete-product/' + prodId, {
        method: 'DELETE',
        headers: {
            'csrf-token': csrf
        }
    })
    .then(result => {
        return result.json();
    })
    .then(data => {
        console.log(data);
        parentElement.parentNode.removeChild(parentElement);
    })
    .catch(err => {
        console.log(err);
    });
}