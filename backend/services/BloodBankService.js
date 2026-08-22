const { bloodBankRepo } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class BloodBankService {
  async list({ search, bloodGroup, status, page = 1, limit = 50 } = {}) {
    let items = await bloodBankRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.donorName || '').toLowerCase().includes(q) ||
        (i.bloodGroup || '').toLowerCase().includes(q) ||
        (i.bagId || '').toLowerCase().includes(q) ||
        (i.crossMatchPatientUhid || '').toLowerCase().includes(q)
      );
    }

    if (bloodGroup) items = items.filter(i => i.bloodGroup === bloodGroup);
    if (status) items = items.filter(i => i.status === status);

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);

    return {
      bloodInventory: items.slice(startIndex, startIndex + Number(limit)),
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async create(data) {
    const tenantId = getCurrentTenantId();
    const count = await bloodBankRepo.count({});
    const bagId = data.bagId || `BB-BAG-${String(count + 1).padStart(5, '0')}`;

    return bloodBankRepo.create({
      tenantId,
      bagId,
      donorName: data.donorName || 'Voluntary Donor',
      bloodGroup: data.bloodGroup || 'O+',
      componentType: data.componentType || 'Packed Red Blood Cells (PRBC)',
      quantityMl: Number(data.quantityMl) || 350,
      collectionDate: data.collectionDate || new Date().toISOString(),
      expiryDate: data.expiryDate || new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      crossMatchPatientUhid: data.crossMatchPatientUhid || '',
      issueStatus: data.issueStatus || 'Available',
      status: 'Active'
    });
  }

  async update(id, data) {
    return bloodBankRepo.update(id, data);
  }
}

module.exports = new BloodBankService();
